import { space, system, editor, codeWidget } from "@silverbulletmd/silverbullet/syscalls";
import { parse as yamlparse, stringify as yamlstringify } from "jsr:@std/yaml";

const SPOOLS_FILE = "spools.yaml";
const JOBS_FILE = "jobs.yaml";

export async function renderSpools(excludeRetired: boolean | true): Promise<string> {
  let spools = await getSpools();

  let html = `<div class='silverspooler spools'>
  <table>
  <thead>
    <tr>
      <td>Brand</td>
      <td>Material</td>
      <td>Color</td>
      <td style='text-align: right;'>Left</td>
      <td style='text-align: right;'>Initial</td>
      <td style='text-align: right;'>Gross</td>
      <td style='text-align: center;'></td>
    </tr>
  </thead>
  <tbody>`;

  html += `<tr class='newspool'>
    <td><input type='text' required id='spoolbrand' placeholder='New Brand' style='width: 100%;' /></td>
    <td><input type='text' required id='spoolmaterial' placeholder='New Material' style='width: 100%;' /></td>
    <td><input type='color' required id='spoolcolor' /><input type='checkbox' id='spooltranslucent' /> <label for='spooltranslucent' title='Translucent or transparent filament'>TL</label></td>
    <td style='text-align: right;'>&mdash;</td>
    <td style='text-align: right;'><input type='number' required id='spoolnetweight' style='width: 60%;' /></td>
    <td style='text-align: right;'><input type='number' required id='spoolgrossweight' style='width: 60%;' /></td>
    <td>
      <button class="sb-button-primary" data-item="newspool" onclick='javascript:document.getElementById("newspooldata").value ="br="+encodeURIComponent(document.getElementById("spoolbrand").value)+"&mt="+encodeURIComponent(document.getElementById("spoolmaterial").value)+"&cl="+encodeURIComponent(document.getElementById("spoolcolor").value)+"&tl="+encodeURIComponent(document.getElementById("spooltranslucent").checked)+"&nw="+encodeURIComponent(document.getElementById("spoolnetweight").value)+"&gw="+encodeURIComponent(document.getElementById("spoolgrossweight").value);'>Add</button>
      <input type='hidden' id='newspooldata' value='test-data' />
    </td></tr>`;

  let displayedSpools = 0;
  let totalInitial = 0;
  let totalRemaining = 0;

  spools.forEach((s) => {
    if (!excludeRetired || (excludeRetired && !s.isRetired)) {
      html += `<tr class='${s.isRetired ? "retired" : "active"}'>
      <td>${s.brand}</td>
      <td>${s.material}</td>
      <td>${renderColor(s.color, s.isTranslucent)}</td>`;

      if (s.isRetired) {
        html += "<td style='text-align: right;' class='remaining'>&mdash;</td><td style='text-align: right;'>&mdash;</td><td style='text-align: right;'>&mdash;</td><td></td>"
      }
      else {
        html += `
        <td style='text-align: right;' class='left'">${s.remainingWeight}</td>
        <td style='text-align: right;' class="net">${s.initialNetWeight}</td>
        <td style='text-align: right;' class="gross">${s.grossWeight}</td>`;
        html += `<td><button class='sb-button-primary spoolretire' data-item='retire|${s.id}'>Retire</button></td>`;
      }

      html += "</tr>";

      displayedSpools++;
      totalInitial += s.initialNetWeight;
      totalRemaining += s.remainingWeight;
    }
  });

  html += "</tbody>"

  html += `<tfoot><tr><td colspan='3'>${displayedSpools} Spools</td><td style='text-align: right;'>${totalRemaining}</td><td style='text-align: right;'>${totalInitial}</td><td style='text-align: right;'>&mdash;</td><td></td></tr></tfoot>`

  html += "</table></div>";

  return html;
}

export async function renderPrintJobs(): Promise<string> {
  let jobs = await getPrintJobs();

  let html = `<div class='silverspooler printjobs'>
  <table>
  <thead>
    <tr>
      <td style='text-align: right;'>Date</td>
      <td>Description</td>
      <td colspan='3'>Spool</td>
      <td style='text-align: right;'>Weight</td>
      <td style='text-align: right;'>Duration</td>
      <td>Notes</td>
      <td></td>
    </tr>
  </thead>
  <tbody>`;

  jobs.forEach((j) => {
    html += `<tr>
    <td style='text-align: right;'>${new Date(j.date).toLocaleDateString()}</td>
    <td>${j.description}</td>
    <td>${j.spoolBrand}</td>
    <td>${j.spoolMaterial}</td>
    <td>${renderColor(j.spoolColor, j.spoolIsTranslucent)}</td>
    <td style='text-align: right;'>${j.filamentWeight}</td>
    <td style='text-align: right;'>${prettifyDuration(j.duration)}</td>
    <td>${j.notes ? j.notes : ""}</td>
    <td>TODO</td>
    </tr>`;
  });

  html += `</tbody>
  </table>
  </div>`;

  return html;
}

function renderColor(color: string, isTranslucent: boolean) {
  let rgba = color + (isTranslucent ? "55" : "FF");

  if (isTranslucent) {
    return `<span title='${color}/TL'><span style="background-color: ${color}; color: ${color};">&nbsp;&bull;&bull;&bull;&nbsp;</span><span style="background-color: ${rgba};">&nbsp;<span style="color: white;">&bull;</span><span style='color: lightgrey;'>&bull;</span><span style="color: black;">&bull;</span>&nbsp;</span></span>`;
  }
  else {
    return `<span title='${color}'><span style="background-color: ${color}; color: ${color};">&nbsp;&bull;&bull;&bull;&nbsp;</span><span style="background-color: ${color}; color: ${color};">&nbsp;&bull;&bull;&bull;&nbsp;</span></span>`;
  }
}

export async function click(dataItem: string, args: string) {
  if (!hasContent(dataItem)) {
    return;
  }

  if (dataItem.startsWith("retire|")) {
    let confirmed = await editor.confirm("Are you sure you want to retire that spool?");
    if (confirmed) {
      let spoolId = dataItem.substring(7);

      let spools = await getSpools();
      for (const s of spools) {
        if (s.id == spoolId) {
          s.isRetired = true;
          await saveSpools(spools);
          await refreshInternal("Spool retired.");
          break;
        }
      };
    }
  }
  else if (dataItem == "newspool") {
    if (!hasContent(args)) {
      log("No valid arguments.");
      return;
    }

    let pairs = args.split("&");
    let spoolBrand: string = "";
    let spoolMaterial: string = "";
    let spoolColor: string = "";
    let spoolTranslucent: boolean = false;
    let spoolNetWeight: number = 0;
    let spoolGrossWeight: number = 0;

    for (const p of pairs) {
      let tuple = p.split('=');
      tuple[1] = decodeURIComponent(tuple[1]);

      if (tuple[0] == "br") {
        spoolBrand = tuple[1];
      }
      else if (tuple[0] == "mt") {
        spoolMaterial = tuple[1];
      }
      else if (tuple[0] == "cl") {
        spoolColor = tuple[1].toUpperCase();
      }
      else if (tuple[0] == "tl") {
        tuple[1] = tuple[1].toLowerCase();
        spoolTranslucent = tuple[1] === "true" || tuple[1] === "1" || tuple[1] === "on";
      }
      else if (tuple[0] == "nw") {
        spoolNetWeight = Number(tuple[1]);
      }
      else if (tuple[0] == "gw") {
        spoolGrossWeight = Number(tuple[1]);
      }
    }

    if (!hasContent(spoolBrand)) {
      editor.flashNotification("Please specify spool Brand.");
      return;
    }
    if (!hasContent(spoolMaterial)) {
      editor.flashNotification("Please specify spool Material.");
      return;
    }
    if (!hasContent(spoolColor)) {
      editor.flashNotification("Please specify spool Color.");
      return;
    }
    if (spoolNetWeight <= 0 || spoolNetWeight > 10000) {
      editor.flashNotification("Please specify a spool Net Weight between 1 and 10000.");
      return;
    }
    if (spoolGrossWeight <= 0 || spoolGrossWeight > 10000) {
      editor.flashNotification("Please specify a spool Gross Weight between 1 and 10000.");
      return;
    }
    if (spoolGrossWeight <= spoolNetWeight) {
      editor.flashNotification("Please specify a spool Gross Weight larger than Net Weight.");
      return;
    }

    let confirmed = await editor.confirm("Are you sure you want to add that new spool?");
    if (!confirmed) {
      return;
    }

    let newSpool: LiveSpool = {
      id: newUUID(),
      brand: spoolBrand,
      material: spoolMaterial,
      color: spoolColor,
      isTranslucent: spoolTranslucent,
      initialNetWeight: spoolNetWeight,
      grossWeight: spoolGrossWeight,
      isRetired: false,
      remainingWeight: spoolNetWeight
    };

    let spools = await getSpools();

    spools.push(newSpool);

    await saveSpools(spools);
    await refreshInternal("New spool saved.")
  }
  else {
    log("Invalid click data.");
  }
}

export async function refresh() {
  // This might not be enough without a forced space sync?
  _config = null;
  _spools = null;
  _jobs = null;
  await refreshInternal("SilverSpooler data refreshed.");
}

async function refreshInternal(message: string) {
  await codeWidget.refreshAll();
  await editor.flashNotification(message);
}

var _spools: Array<LiveSpool> | null;
async function getSpools(): Promise<Array<LiveSpool>> {
  if (_spools === undefined || _spools === null) {
    let sf = await getFilePath(SPOOLS_FILE);
    log("Loading spools from " + sf);
    let spoolsData = uint8ArrayToString(await space.readDocument(sf));

    if (hasContent(spoolsData)) {
      _spools = await yamlparse(spoolsData).spools as Array<LiveSpool>;
      await loadRemainingWeight(_spools);
    }
    else {
      _spools = new Array<LiveSpool>();
    }

    log("Loaded spools: " + _spools.length);
  }

  return _spools;
}

async function saveSpools(spools: Array<LiveSpool>) {
  _spools = spools;

  let staticSpools: Array<Spool> = new Array<Spool>();

  for (const s of spools) {
    staticSpools.push({
      id: s.id,
      brand: s.brand,
      material: s.material,
      color: s.color,
      isTranslucent: s.isTranslucent,
      grossWeight: s.grossWeight,
      initialNetWeight: s.initialNetWeight,
      isRetired: s.isRetired
    } as Spool);
  }

  let rawData = await yamlstringify({ spools: staticSpools });

  await space.writeDocument(await getFilePath(SPOOLS_FILE), stringToUint8Array(rawData));
}

var _jobs: Array<LivePrintJob> | null;
async function getPrintJobs(): Promise<Array<LivePrintJob>> {
  if (_jobs === undefined || _jobs === null) {
    let jf = await getFilePath(JOBS_FILE);
    log("Loading jobs from " + jf);
    let jobsData = uint8ArrayToString(await space.readDocument(jf));

    if (hasContent(jobsData)) {
      // No sort to preserve performance
      _jobs = await yamlparse(jobsData).jobs as Array<LivePrintJob>;
      await loadSpoolNames(_jobs);
    }
    else {
      _jobs = new Array<LivePrintJob>();
    }

    log("Loaded jobs: " + _jobs.length);
  }

  return _jobs;
}

async function loadRemainingWeight(spools: Array<LiveSpool>) {
  let jobs = await getPrintJobs();

  spools.forEach((s) => {
    if (s.remainingWeight === undefined || s.remainingWeight === null) {
      s.remainingWeight = s.initialNetWeight;
    }
    jobs.forEach((j) => {
      if (j.spoolId === s.id) {
        s.remainingWeight -= j.filamentWeight;
      }
    });
  });
}

async function loadSpoolNames(jobs: Array<LivePrintJob>) {
  let spools = await getSpools();

  jobs.forEach((j) => {
    j.spoolBrand = "";
    j.spoolMaterial = "";
    j.spoolColor = "";

    spools.forEach((s) => {
      if (s.id === j.spoolId) {
        j.spoolBrand = s.brand;
        j.spoolMaterial = s.material;
        j.spoolColor = s.color;
        j.spoolIsTranslucent = s.isTranslucent;
      }
    });
  });
}

function prettifyDuration(duration: number): string {
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  // Pad minutes with a leading zero if it's less than 10
  const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  if (hours > 0) {
    return `${hours}h ${paddedMinutes}m`;
  }
  else {
    return `${paddedMinutes}m`;
  }
}

async function getFilePath(fileName: string): Promise<string> {
  const pathPrefix = (await getConfig()).pathPrefix;

  return pathPrefix + fileName;
}

var _config: SilverSpoolerConfig | null;
async function getConfig(): Promise<SilverSpoolerConfig> {
  if (_config === undefined || _config === null) {
    log("Reading settings");
    let config = await system.getConfig<SilverSpoolerConfig>("silverSpooler", {} as SilverSpoolerConfig);

    if (!hasContent(config.pathPrefix)) {
      config.pathPrefix = "Files/SilverSpooler/";
    }

    _config = config;
  }

  return _config;
}

function uint8ArrayToString(array: Uint8Array, encoding: string = 'utf-8'): string {
  const decoder = new TextDecoder(encoding);
  return decoder.decode(array);
}
function stringToUint8Array(data: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(data);
}

function hasContent(data: string): boolean {
  if (typeof data === "string" && data.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

function newUUID(): string {
  let uuid = crypto.randomUUID();

  // Remove dashes and brackets
  return uuid.replace(/[{}()-]/g, '');
}

function log(message: string) {
  console.log("SilverSpooler: " + message);
}

type SilverSpoolerConfig = {
  pathPrefix?: string;
}

type Spool = {
  id: string;
  brand: string;
  material: string;
  color: string;
  isTranslucent: boolean;
  grossWeight: number;
  initialNetWeight: number;
  isRetired: boolean;
};

type LiveSpool = Spool & {
  remainingWeight: number;
}

type PrintJob = {
  id: string;
  spoolId: string;
  date: string;
  description: string;
  filamentWeight: number;
  duration: number;
  notes: string;
}

type LivePrintJob = PrintJob & {
  spoolBrand: string;
  spoolMaterial: string;
  spoolColor: string;
  spoolIsTranslucent: boolean
}
