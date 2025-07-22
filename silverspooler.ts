import { space, system } from "@silverbulletmd/silverbullet/syscalls";
import { parse, stringify } from "jsr:@std/yaml";

const SPOOLS_FILE = "spools.yaml";

export async function renderSpools() {
  let spools = await getSpools();

  console.log(spools);

  let s: Spool = {
    id: "asd",
    brand: "sss",
    material: "vblakd",
    colorName: "Blue",
    initialNetWeight: 1000
  }

  let ss: string = stringify(s);

  let sout: Spool = parse(ss) as Spool;

  //console.log(ss);
  //console.log(sout);
}

var _spools: Array<Spool>;
async function getSpools(): Promise<Array<Spool>> {
  if (_spools === undefined || _spools === null) {
    let sf = await getFilePath(SPOOLS_FILE);
    log("Loading spools from " + sf);
    let spoolsData = uint8ArrayToString(await space.readDocument(sf));

    if (hasContent(spoolsData)) {
      _spools = parse(spoolsData) as Array<Spool>;
    }
    else {
      _spools = new Array<Spool>;
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