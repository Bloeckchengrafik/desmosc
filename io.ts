import {Expr} from "./app";
import {readFile, writeFile} from "fs/promises";
import {exec} from "child_process";
import {parseBlock} from "./desmap";

export async function exportExprs(exprs: Expr[]): Promise<void> {
    let data = JSON.stringify({
        exprs: exprs,
    });
    await writeFile("Desmos-Desktop/exprs.txt", data);
}

export async function runDesktop(exprs: Expr[]): Promise<void> {
    await exportExprs(exprs);
    await exec("npm run desktop");
}

export async function loadDesMap(name: string): Promise<Expr[]> {
    let content = await readFile(`desmap/${name}.dsm`, "utf-8").then(all => all.split("\n"));
    // consume line blocks (separated by empty lines)
    let block: string[] = [];
    let blocks: Promise<Expr>[] = [];
    for (let line of content) {
        if (line === "") {
            blocks.push(parseBlock(block));
            block = [];
        } else {
            block.push(line);
        }
    }

    // Do not forget the last block
    if (block.length > 0) {
        blocks.push(parseBlock(block));
    }

    // Wait for all blocks to be parsed
    return await Promise.all(blocks);
}