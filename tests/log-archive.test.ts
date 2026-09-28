import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { archivePowerLogs } from "../lib/log-archive";

test("archives raw Power.log bytes independently from stats", async () => {
  const sourceRoot=await mkdtemp(path.join(os.tmpdir(),"hearthstone-source-"));
  const archiveRoot=await mkdtemp(path.join(os.tmpdir(),"hearthstone-archive-"));
  const session=path.join(sourceRoot,"session-1");
  const source=path.join(session,"Power.log");
  const archived=path.join(archiveRoot,"session-1","Power.log");
  try {
    await mkdir(session);
    await writeFile(source,"first line\n");
    assert.equal(await archivePowerLogs(sourceRoot,archiveRoot),1);
    assert.equal(await readFile(archived,"utf8"),"first line\n");

    await writeFile(source,"first line\nsecond line\n");
    assert.equal(await archivePowerLogs(sourceRoot,archiveRoot),1);
    assert.equal(await readFile(archived,"utf8"),"first line\nsecond line\n");

    await rm(session,{recursive:true,force:true});
    assert.equal(await archivePowerLogs(sourceRoot,archiveRoot),0);
    assert.equal(await readFile(archived,"utf8"),"first line\nsecond line\n");
  } finally {
    await rm(sourceRoot,{recursive:true,force:true});
    await rm(archiveRoot,{recursive:true,force:true});
  }
});
