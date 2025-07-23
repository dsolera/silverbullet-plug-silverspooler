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
      <td>Notes</td>
      <td style='text-align: center;'></td>
    </tr>
  </thead>
  <tbody>`;

  html += `<tr class='newspool'>
    <td><input type='text' required id='spoolbrand' placeholder='New Brand' style='width: 100%;' /></td>
    <td><input type='text' required id='spoolmaterial' placeholder='New Material' style='width: 100%;' /></td>
    <td><input type='color' required id='spoolcolor' /><input type='checkbox' id='spooltranslucent' /> <label for='spooltranslucent' title='Translucent or transparent filament'>TL</label></td>
    <td style='text-align: right;'>&mdash;</td>
    <td style='text-align: right;'><input type='number' required id='spoolnetweight' style='width: 60%; text-align: right;' value='1000' /></td>
    <td style='text-align: right;'><input type='number' required id='spoolgrossweight' style='width: 60%; text-align: right;' /></td>
    <td><input type='text' id='spoolnotes' style='width: 100%;' /></td>
    <td>
      <button class="sb-button-primary" data-item="newspool" onclick='javascript:document.getElementById("newspooldata").value ="br="+encodeURIComponent(document.getElementById("spoolbrand").value)+"&mt="+encodeURIComponent(document.getElementById("spoolmaterial").value)+"&cl="+encodeURIComponent(document.getElementById("spoolcolor").value)+"&tl="+encodeURIComponent(document.getElementById("spooltranslucent").checked)+"&nw="+encodeURIComponent(document.getElementById("spoolnetweight").value)+"&gw="+encodeURIComponent(document.getElementById("spoolgrossweight").value)+"&nt="+encodeURIComponent(document.getElementById("spoolnotes").value);'>Add</button>
      <input type='hidden' id='newspooldata' value='test-data' />
    </td></tr>`;

  let displayedSpools = 0;
  let retiredSpools = 0;
  let totalInitial = 0;
  let totalRemaining = 0;

  spools.forEach((s) => {
    if (!excludeRetired || (excludeRetired && !s.isRetired)) {
      html += `<tr class='${s.isRetired ? "retired" : "active"}'>
      <td>${s.brand}</td>
      <td>${s.material}</td>
      <td>${renderColor(s.color, s.isTranslucent)}</td>`;

      if (s.isRetired) {
        html += `<td style='text-align: right;' class='remaining'>&mdash;</td><td style='text-align: right;'>&mdash;</td><td style='text-align: right;'>&mdash;</td><td style='font-size: 0.8em;'>${s.notes ? s.notes : ""}</td><td></td>`;
      }
      else {
        html += `
        <td style='text-align: right;' class='left'">${s.remainingWeight}</td>
        <td style='text-align: right;' class="net">${s.initialNetWeight}</td>
        <td style='text-align: right;' class="gross">${s.grossWeight}</td>
        <td style='font-size: 0.8em;'>${s.notes ? s.notes : ""} <button class='sb-button' data-item="spoolnote|${s.id}">Edit</button></td>`;
        html += `<td><button class='sb-button-primary spoolretire' data-item='retire|${s.id}'>Retire</button></td>`;
      }

      html += "</tr>";

      displayedSpools++;
      totalInitial += s.initialNetWeight;
      totalRemaining += s.remainingWeight;
    }
    else {
      retiredSpools++;
    }
  });

  html += "</tbody>"

  html += `<tfoot><tr><td colspan='3'>${displayedSpools} Spools${retiredSpools > 0 ? " (+" + retiredSpools + " Retired)" : ""}</td><td style='text-align: right;'>${totalRemaining}</td><td style='text-align: right;'>${totalInitial}</td><td style='text-align: right;'></td><td></td><td></td></tr></tfoot>`

  html += "</table></div>";

  return html;
}

export async function renderPrintJobs(excludeRetired: boolean | true): Promise<string> {
  let jobs = await getPrintJobs();
  // Sort by date desc
  jobs.sort((a, b) => { return b.date.localeCompare(a.date); });

  let spools = await getSpools();

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

  let filamentOptions: string = "";
  for (const s of spools) {
    if (!s.isRetired || (s.isRetired && !excludeRetired)) {
      filamentOptions += `<option value='${s.id}'>${s.brand} | ${s.material} | ${renderColorSimple(s.color, s.isTranslucent)}${s.isRetired ? " (Retired)" : ""}</value>`;
    }
  }

  html += `<tr class='newprintjob'>
    <td><input type='date' required id='printjobdate' style='width: 100%;' value="${typeof _justDeletedPrintJob !== "undefined" ? _justDeletedPrintJob?.date : ""}" /></td>
    <td><input type='text' required id='printjobdesc' placeholder='Job Description' style='width: 100%;' value="${typeof _justDeletedPrintJob !== "undefined" ? _justDeletedPrintJob?.description : ""}" /></td>
    <td colspan='3'><select id='printjobfilament' value="${typeof _justDeletedPrintJob !== "undefined" ? _justDeletedPrintJob?.spoolId : ""}">${filamentOptions}</select></td>
    <td style='text-align: right;'><input type='number' required id='printjobweight' style='width: 60%; text-align: right;' value="${typeof _justDeletedPrintJob !== "undefined" ? _justDeletedPrintJob?.filamentWeight : ""}" /></td>
    <td style='text-align: right;'><input type='number' required id='printjobduration' style='width: 60%; text-align: right;' value="${typeof _justDeletedPrintJob !== "undefined" ? _justDeletedPrintJob?.duration : ""}" /></td>
    <td><input type='text' id='printjobnotes' style='width: 100%;' value="${typeof _justDeletedPrintJob !== "undefined" ? _justDeletedPrintJob?.notes : ""}" /></td>
    <td>
      <button class="sb-button-primary" data-item="newprintjob" onclick='javascript:document.getElementById("newprintjobdata").value ="dt="+encodeURIComponent(document.getElementById("printjobdate").value)+"&ds="+encodeURIComponent(document.getElementById("printjobdesc").value)+"&fl="+encodeURIComponent(document.getElementById("printjobfilament").value)+"&wg="+encodeURIComponent(document.getElementById("printjobweight").value)+"&dr="+encodeURIComponent(document.getElementById("printjobduration").value)+"&nt="+encodeURIComponent(document.getElementById("printjobnotes").value);'>Add</button>
      <input type='hidden' id='newprintjobdata' value='test-data' />
    </td></tr>`;

  let totalJobs = 0;
  let totalWeight = 0;
  let totalDuration = 0;

  jobs.forEach((j) => {
    html += `<tr>
    <td style='text-align: right;'>${new Date(j.date).toLocaleDateString()}</td>
    <td>${j.description}</td>
    <td>${j.spoolBrand}</td>
    <td>${j.spoolMaterial}</td>
    <td>${renderColor(j.spoolColor, j.spoolIsTranslucent)}</td>
    <td style='text-align: right;'>${j.filamentWeight}</td>
    <td style='text-align: right;'>${prettifyDuration(j.duration)}</td>
    <td style='font-size: 0.8em;'>${j.notes ? j.notes : ""}</td>`;

    if (j.spoolIsRetired && excludeRetired) {
      html += "<td></td>";
    }
    else {
      html +=
        `<td><button class='sb-button-primary' onclick='javascript:document.getElementById("printjobdate").value="${j.date.substring(0, 10)}";document.getElementById("printjobdesc").value="${j.description}";document.getElementById("printjobfilament").value="${j.spoolId}";document.getElementById("printjobweight").value="${j.filamentWeight}";document.getElementById("printjobduration").value="${j.duration}";document.getElementById("printjobnotes").value="${j.notes ? j.notes : ''}";this.parentElement.parentElement.remove();' data-item="deletejob|${j.id}">Del &amp; Redo</button></td>`;
    }

    totalJobs++;
    totalWeight += j.filamentWeight;
    totalDuration += j.duration;

    html += "</tr>";
  });

  html += "</tbody><tfoot>";

  html += `<tr><td colspan='5'>${totalJobs} Print Jobs</td><td style='text-align: right;'>${totalWeight}</td><td style='text-align: right;'>${prettifyDuration(totalDuration)}</td><td></td><td></td></tr>`;

  html += "</tfoot></table></div>";

  return html;
}

function renderColor(color: string, isTranslucent: boolean) {
  let rgba = color + (isTranslucent ? "55" : "FF");

  let result = "";

  if (isTranslucent) {
    result = `<span title='${color}/TL'><span style="background-color: ${color}; color: ${color};">&nbsp;&bull;&bull;&bull;&nbsp;</span><span style="background-color: ${rgba};">&nbsp;<span style="color: white;">&bull;</span><span style='color: lightgrey;'>&bull;</span><span style="color: black;">&bull;</span>&nbsp;</span></span>`;
  }
  else {
    result = `<span title='${color}'><span style="background-color: ${color}; color: ${color};">&nbsp;&bull;&bull;&bull;&nbsp;</span><span style="background-color: ${color}; color: ${color};">&nbsp;&bull;&bull;&bull;&nbsp;</span></span>`;
  }

  return result + " <span style='font-size: 0.8em;'>" + renderColorSimple(color, isTranslucent) + "</span>";
}
function renderColorSimple(color: string, isTranslucent: boolean) {
  return color + (isTranslucent ? "/TL" : "");
}

export async function click(dataItem: string, args: string) {
  if (!hasContent(dataItem)) {
    return;
  }

  if (dataItem.startsWith("retire|")) {
    await retireSpool(dataItem.substring(7));
  }
  else if (dataItem == "newspool") {
    await saveNewSpool(args);
  }
  else if (dataItem.startsWith("deletejob|")) {
    await deletePrintJob(dataItem.substring(10));
  }
  else if (dataItem == "newprintjob") {
    await saveNewPrintJob(args);
  }
  else if (dataItem.startsWith("spoolnote|")) {
    await editSpoolNote(dataItem.substring(10));
  }
  else {
    log("Invalid click data.");
  }
}

export async function refresh() {
  // This might not be enough without a forced space sync?
  _config = null;
  _spools = null;
  _printJobs = null;
  _justDeletedPrintJob = undefined;
  await refreshInternal("SilverSpooler data refreshed.");
}

async function refreshInternal(message: string) {
  await codeWidget.refreshAll();
  await editor.flashNotification(message);
}

async function retireSpool(spoolId: string) {
  let confirmed = await editor.confirm("Are you sure you want to retire that spool?");
  if (confirmed) {
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

async function saveNewSpool(args: string) {
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
  let spoolNotes = "";

  for (const p of pairs) {
    let tuple = p.split('=');
    tuple[1] = sanitize(decodeURIComponent(tuple[1]));

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
    else if (tuple[0] == "nt") {
      spoolNotes = tuple[1];
    }
  }

  if (!hasContent(spoolBrand)) {
    editor.flashNotification("Please specify spool brand.");
    return;
  }
  if (!hasContent(spoolMaterial)) {
    editor.flashNotification("Please specify spool material.");
    return;
  }
  if (!hasContent(spoolColor)) {
    editor.flashNotification("Please specify spool color.");
    return;
  }
  if (spoolNetWeight <= 0 || spoolNetWeight > 10000) {
    editor.flashNotification("Please specify a spool net weight between 1 and 10000.");
    return;
  }
  if (spoolGrossWeight <= 0 || spoolGrossWeight > 10000) {
    editor.flashNotification("Please specify a spool gross weight between 1 and 10000.");
    return;
  }
  if (spoolGrossWeight <= spoolNetWeight) {
    editor.flashNotification("Please specify a spool gross weight larger than Net Weight.");
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
    notes: spoolNotes,
    remainingWeight: spoolNetWeight
  };

  let spools = await getSpools();

  spools.push(newSpool);

  await saveSpools(spools);
  await refreshInternal("New spool saved.");
}

async function deletePrintJob(printJobId: string) {
  let printJobs = await getPrintJobs();

  _justDeletedPrintJob = printJobs.find(j => j.id === printJobId);

  let newPrintJobs = printJobs.filter(j => j.id !== printJobId);

  if (newPrintJobs.length < printJobs.length) {
    await savePrintJobs(newPrintJobs);
    await refreshInternal("Print job deleted.");
  }
}

async function saveNewPrintJob(args: string) {
  if (!hasContent(args)) {
    log("No valid arguments.");
    return;
  }

  let pairs = args.split("&");
  let jobDate: string = "";
  let jobDesc: string = "";
  let jobSpoolId: string = "";
  let jobWeight: number = 0;
  let jobDuration: number = 0;
  let jobNotes: string = "";

  for (const p of pairs) {
    let tuple = p.split('=');
    tuple[1] = sanitize(decodeURIComponent(tuple[1]));

    if (tuple[0] == "dt") {
      jobDate = tuple[1];
    }
    else if (tuple[0] == "ds") {
      jobDesc = tuple[1];
    }
    else if (tuple[0] == "fl") {
      jobSpoolId = tuple[1];
    }
    else if (tuple[0] == "wg") {
      jobWeight = Number(tuple[1]);
    }
    else if (tuple[0] == "dr") {
      jobDuration = Number(tuple[1]);
    }
    else if (tuple[0] == "nt") {
      jobNotes = tuple[1];
    }
  }

  let selectedSpool = (await getSpools()).find(s => s.id === jobSpoolId);

  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(jobDate)) {
    editor.flashNotification("Please specify a valid print job date.");
    return;
  }
  if (typeof selectedSpool === "undefined") {
    editor.flashNotification("Please specify a valid filament spool.");
    return;
  }
  if (jobWeight <= 0 || jobWeight > 10000) {
    editor.flashNotification("Please specify a print job weight between 1 and 10000.");
    return;
  }
  if (jobDuration <= 0 || jobDuration > 1000) {
    editor.flashNotification("Please specify a print job duration between 1 and 1000.");
    return;
  }

  let confirmed = await editor.confirm("Are you sure you want to add that new print job?");
  if (!confirmed) {
    return;
  }

  let newPrintJob: LivePrintJob = {
    id: newUUID(),
    spoolId: jobSpoolId,
    date: jobDate,
    description: jobDesc,
    filamentWeight: jobWeight,
    duration: jobDuration,
    notes: jobNotes,
    spoolBrand: selectedSpool.brand,
    spoolMaterial: selectedSpool.material,
    spoolColor: selectedSpool.color,
    spoolIsTranslucent: selectedSpool.isTranslucent,
    spoolIsRetired: selectedSpool.isRetired
  };

  let printJobs = await getPrintJobs();

  printJobs.push(newPrintJob);

  await savePrintJobs(printJobs);
  _justDeletedPrintJob = undefined;
  await refreshInternal("New print job saved.");
}

async function editSpoolNote(spoolId: string) {
  let spools = await getSpools();

  let mySpool = spools.find(s => s.id === spoolId);

  if (typeof mySpool === "undefined") {
    log("Spool not found.");
    return;
  }

  let newNote = sanitize(await editor.prompt("Spool notes:", mySpool.notes));

  if (newNote !== mySpool.notes) {
    mySpool.notes = newNote;
    await saveSpools(spools);
    await refreshInternal("Spool notes saved.");
  }
}

var _spools: Array<LiveSpool> | null;
async function getSpools(): Promise<Array<LiveSpool>> {
  if (_spools === undefined || _spools === null) {
    let sf = await getFilePath(SPOOLS_FILE);
    log("Loading spools from " + sf);

    let spoolsData = "";

    for (const d of (await space.listDocuments())) {
      if (d.name === sf) {
        spoolsData = uint8ArrayToString(await space.readDocument(sf));
      }
    }

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
      isRetired: s.isRetired,
      notes: hasContent(s.notes) ? s.notes : ""
    } as Spool);
  }

  let rawData = await yamlstringify({ spools: staticSpools });

  await space.writeDocument(await getFilePath(SPOOLS_FILE), stringToUint8Array(rawData));
}

var _justDeletedPrintJob: LivePrintJob | undefined;
var _printJobs: Array<LivePrintJob> | null;
async function getPrintJobs(): Promise<Array<LivePrintJob>> {
  if (_printJobs === undefined || _printJobs === null) {
    let jf = await getFilePath(JOBS_FILE);
    log("Loading jobs from " + jf);

    let jobsData = "";

    for (const d of (await space.listDocuments())) {
      if (d.name === jf) {
        jobsData = uint8ArrayToString(await space.readDocument(jf));
      }
    }

    if (hasContent(jobsData)) {
      // No sort to preserve performance
      _printJobs = await yamlparse(jobsData).jobs as Array<LivePrintJob>;
      await loadSpoolData(_printJobs);
    }
    else {
      _printJobs = new Array<LivePrintJob>();
    }

    log("Loaded jobs: " + _printJobs.length);
  }

  return _printJobs;
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

async function loadSpoolData(jobs: Array<LivePrintJob>) {
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
        j.spoolIsRetired = s.isRetired;
      }
    });
  });
}

async function savePrintJobs(printJobs: Array<LivePrintJob>) {
  _printJobs = printJobs;

  let staticJobs: Array<PrintJob> = new Array<PrintJob>();

  for (const j of printJobs) {
    staticJobs.push({
      id: j.id,
      spoolId: j.spoolId,
      date: j.date,
      description: j.description,
      filamentWeight: j.filamentWeight,
      duration: j.duration,
      notes: hasContent(j.notes) ? j.notes : ""
    } as PrintJob);
  }

  let rawData = await yamlstringify({ jobs: staticJobs });

  await space.writeDocument(await getFilePath(JOBS_FILE), stringToUint8Array(rawData));

  // Need to force a cleanup to re-calculate spool remaining filament
  _spools = null;
}

function prettifyDuration(duration: number): string {
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (hours > 0) {
    // Pad minutes with a leading zero if it's less than 10
    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}h ${paddedMinutes}m`;
  }
  else {
    return `${minutes}m`;
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

function sanitize(string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    "/": '&#x2F;',
  };
  const reg = /[&<>"'/]/ig;
  return string.replace(reg, (match) => (map[match]));
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
  notes: string;
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
  spoolIsTranslucent: boolean;
  spoolIsRetired: boolean;
}
