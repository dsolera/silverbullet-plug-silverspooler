import { space, system } from "@silverbulletmd/silverbullet/syscalls";
import { parse, stringify } from "jsr:@std/yaml";

const SPOOLS_FILE = "spools.yaml";

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
    <td style='text-align: right;'>TODO</td>
    <td>TODO</td>
    </tr>`;
  });

  html += `</tbody>
  </table>
  </div>`;

  return html;
}

var _spools: Array<Spool>;
async function getSpools(): Promise<Array<Spool>> {
  if (_spools === undefined || _spools === null) {
    let sf = await getFilePath(SPOOLS_FILE);
    log("Loading spools from " + sf);
    let spoolsData = uint8ArrayToString(await space.readDocument(sf));

    if (hasContent(spoolsData)) {
      _spools = parse(spoolsData).spools as Array<Spool>;
    }
    else {
      _spools = new Array<Spool>();
    }
  }

  return _spools;
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
  isTranslucent?: boolean | false;
  diameter?: number | 1.75;
  grossWeight?: number | null;
  initialNetWeight?: number | 1000;
  isRetired?: boolean | false;
  remainingWeight?: number | 0;
};

type PrintJob = {
  id: string;
  spoolId: string;
  date: string;
  description?: string;
  filamentWeight: number;
  duration: number;
  notes?: string;
}