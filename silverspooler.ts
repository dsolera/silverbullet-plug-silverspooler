import { space, system } from "@silverbulletmd/silverbullet/syscalls";
import { parse, stringify } from "jsr:@std/yaml";

const SPOOLS_FILE = "spools.yaml";
const JOBS_FILE = "jobs.yaml";

export async function renderSpools(): Promise<string> {
  let spools = await getSpools();

  let html = `<div class='silverspooler'>
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
    html += `<tr>
    <td>${s.brand}</td>
    <td>${s.material}</td>
    <td>${s.colorName}${s.isTranslucent ? "/TL" : ""}</td>
    <td style='text-align: right;' title="${s.grossWeight ? 'Gross: ' + s.grossWeight : ''}">${s.remainingWeight} / ${s.initialNetWeight}</td>
    <td>TODO</td>
    </tr>`;
  });

  html += `</tbody>
  </table>
  </div>`;

  return html;
}

var _spools: Array<LiveSpool>;
async function getSpools(): Promise<Array<LiveSpool>> {
  if (_spools === undefined || _spools === null) {
    let sf = await getFilePath(SPOOLS_FILE);
    log("Loading spools from " + sf);
    let spoolsData = uint8ArrayToString(await space.readDocument(sf));

    if (hasContent(spoolsData)) {
      _spools = parse(spoolsData).spools as Array<LiveSpool>;
      loadRemainingWeight(_spools);
    }
    else {
      _spools = new Array<LiveSpool>();
    }

    log("Loaded spools: " + _spools.length);
  }

  return _spools;
}

async function loadRemainingWeight(spools: Array<LiveSpool>): Promise<void> {
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

var _jobs: Array<PrintJob>;
async function getPrintJobs(): Promise<Array<PrintJob>> {
  if (_jobs === undefined || _jobs === null) {
    let jf = await getFilePath(JOBS_FILE);
    log("Loading jobs from " + jf);
    let jobsData = uint8ArrayToString(await space.readDocument(jf));

    if (hasContent(jobsData)) {
      _jobs = parse(jobsData).jobs as Array<PrintJob>;
    }
    else {
      _jobs = new Array<PrintJob>();
    }

    log("Loaded jobs: " + _jobs.length);
  }

  return _jobs;
}

async function getFilePath(fileName: string): Promise<string> {
  const pathPrefix = (await getConfig()).pathPrefix;

  return pathPrefix + fileName;
}

var _config: SilverSpoolerConfig;
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
  isTranslucent?: boolean;
  diameter?: number;
  grossWeight?: number;
  initialNetWeight: number;
  isRetired?: boolean;
};

type LiveSpool = Spool & {
  remainingWeight?: number;
}

type PrintJob = {
  id: string;
  spoolId: string;
  date: string;
  description?: string;
  filamentWeight: number;
  duration: number;
  notes?: string;
}