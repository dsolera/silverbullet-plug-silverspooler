import { editor } from "@silverbulletmd/silverbullet/syscalls";
import { parse, stringify } from "jsr:@std/yaml";

export async function helloWorld() {
  await editor.flashNotification("Hello world!");

  let s: Spool = {
    id: "asd",
    brand: "sss",
    material: "vblakd",
    color: new Array<number>,
    initialNetWeight: 1000
  }

  let ss: string = stringify(s);

  let sout: Spool = parse(ss) as Spool;

  console.log(ss);
  console.log(sout);
}

type Spool = {
  id: string;
  brand: string;
  material: string;
  color: number[];
  diameter?: number | 1.75;
  grossWeight?: number;
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