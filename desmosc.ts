import {runDesktop} from "./io";
import {CommandObjectMapper} from "./commandObjectMapper";
import clipboard from "clipboardy";

async function main() {
    let mapper = new CommandObjectMapper()

    // Get first commandline argument
    let cmd = process.argv[2]
    if (cmd == undefined) {
        console.log("Usage: node desmosc.ts <file>.des")
        return
    }

    // Read file
    let fs = require('fs/promises')
    let content = await fs.readFile(cmd, 'utf8')

    // Parse file
    let lines = content.split("\n")
    for (let line of lines) {
        mapper.cmds.push(line)
    }

    let exprs = await mapper.transform()
    console.log(exprs.map((expr) => expr.latex).join("\n"))
    clipboard.writeSync(exprs.map((expr) => expr.latex).join("\n"))

    console.log("==== SYMBOL TABLE ====")
    console.log(mapper.memory)

    console.log("==== LABELS ====")
    console.log(mapper.labels)

    console.log("==== LINENO ====")
    console.log(mapper.actionLinenos)

    // runDesktop(exprs).then();
}


main().then()