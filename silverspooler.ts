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
      <td style='text-align: right;'>Remaining</td>
      <td></td>
    </tr>
  </thead>
  <tbody>`;

  spools.forEach((s) => {
    if (!excludeRetired || (excludeRetired && !s.isRetired)) {
      html += `<tr class='${s.isRetired ? "retired" : "active"}'>
      <td>${s.brand}</td>
      <td>${s.material}</td>
      <td>${s.colorName}${s.isTranslucent ? "/TL" : ""}</td>`;

      if (s.isRetired) {
        html += "<td style='text-align: right;' class='remaining'>Retired</td><td></td>"
      }
      else {
        html += `<td style='text-align: right;' class='remaining'">${s.remainingWeight} / ${s.initialNetWeight} / ${s.grossWeight}</td>`;
        html += `<td><button class='sb-button-primary spoolretire' data-item='retire|${s.id}'>Retire</button></td>`;
      }

      html += "</tr>";
    }
  });

  html += `</tbody>
  </table>
  </div>`;

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
    <td>${j.spoolColorName}</td>
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

export async function click(dataItem: string) {
  if (hasContent(dataItem) && dataItem.startsWith("retire|")) {
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
      colorName: s.colorName,
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
    j.spoolBrand = "n/a";
    j.spoolMaterial = "n/a";
    j.spoolColorName = "n/a";

    spools.forEach((s) => {
      if (s.id === j.spoolId) {
        j.spoolBrand = s.brand;
        j.spoolMaterial = s.material;
        j.spoolColorName = s.colorName;
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
  colorName: string;
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
  spoolColorName: string;
  spoolIsTranslucent: boolean
}
