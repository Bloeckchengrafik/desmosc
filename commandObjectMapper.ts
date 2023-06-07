import {loadDesMap} from "./io";
import {Command, Expr} from "./app";


export class CommandObjectMapper {
    public cmds: string[] = []
    public memory = new Set<string>()
    private internalActionIncrement = 0
    public labels = new Map<string, number>()
    public actionLinenos = new Map<string, number>()

    private getRealName(name: string) {
        return `R_{${name}}`
    }

    private getNewInternalActionName(lineno: number|null=null) {
        let inc =  `I_{nternalAction${this.internalActionIncrement++}}`
        if (lineno !== null) {
            this.actionLinenos.set(inc, lineno)
        }
        return inc
    }

    private resolveArgument(arg: string) {
        if (arg.startsWith("$")) {
            return this.getRealName(arg.replace("$", ""))
        } else {
            return arg
        }
    }

    private transformArgs(args: string[]) {
        return args.map((arg) => this.resolveArgument(arg))
    }

    private expr(text: string): Expr {
        return {
            type: "expression",
            latex: text,
        }
    }

    private exprs(...texts: string[]): Expr[] {
        return texts.map((text) => this.expr(text))
    }

    private assertArgsLength(args: string[], length: number) {
        if (args.length !== length) {
            throw new Error(`Invalid arguments for command. Expected ${length} arguments, got ${args.length}`)
        }
    }

    public mov(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 2)

        let [to, from] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        return this.exprs(`${action} = ${to} \\to ${from}`)
    }

    public add(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 2)

        let [to, from] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        return this.exprs(`${action} = ${to} \\to ${to} + ${from}`)
    }

    public sub(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 2)

        let [to, from] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        return this.exprs(`${action} = ${to} \\to ${to} - ${from}`)
    }

    public mul(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 2)

        let [to, from] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        return this.exprs(`${action} = ${to} \\to ${to} \\cdot ${from}`)
    }

    public div(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 2)

        let [to, from] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        return this.exprs(`${action} = ${to} \\to \\frac{${to}}{${from}}`)
    }

    public sin(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 2)

        let [to, from] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        return this.exprs(`${action} = ${to} \\to \\sin\\left\(${from}\\right\)`)
    }

    public cos(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 2)

        let [to, from] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        return this.exprs(`${action} = ${to} \\to \\cos\\left\(${from}\\right\)`)
    }

    public tan(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 2)

        let [to, from] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        return this.exprs(`${action} = ${to} \\to \\tan\\left\(${from}\\right\)`)
    }

    public je(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 3)

        let [a, b, label] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        let labelLineno = this.labels.get(label)
        return this.exprs(`${action} = \\left\\{${a}=${b}:G_{oto}\\left\(${labelLineno}\\right\)\\right\\}`)
    }

    public jne(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 3)

        let [a, b, label] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        let labelLineno = this.labels.get(label)
        return this.exprs(`${action} = \\left\\{${a}\\neq${b}:G_{oto}\\left\(${labelLineno}\\right\)\\right\\}`)
    }

    public jmp(args: string[], lineno: number): Expr[] {
        this.assertArgsLength(args, 1)

        let [label] = this.transformArgs(args)
        let action = this.getNewInternalActionName(lineno)

        let labelLineno = this.labels.get(label)
        return this.exprs(`${action} = G_{oto}\\left\(${labelLineno}\\right\)`)
    }

    public lit(args: string[], lineno: number): Expr[] {
        return this.exprs(args.join(" "))
    }

    public async transform() {
        let exprs: Expr[] = await loadDesMap("magic")

        let commands: Command[] = []
        let lineno = 0

        for (let cmd of this.cmds) {

            lineno++

            // Remove comments
            if (cmd.includes(";"))
                cmd = cmd.split(";")[0]

            // Remove whitespace
            cmd = cmd.trim()

            // Skip empty lines
            if (cmd.length === 0)
                continue

            let data = cmd.split(" ")

            // Check for used registers in the command
            for (let i = 0; i < data.length; i++) {
                if (data[i].startsWith("$")) {
                    let reg = data[i].replace("$", "")
                    let realName = this.getRealName(reg)

                    if (!this.memory.has(realName)) {
                        this.memory.add(realName)
                    }
                }
            }

            if (data.length === 0) {
                throw new Error(`Invalid command at line ${lineno}`)
            }

            // Check if the command is a label
            if (data[0].endsWith(":")) {
                let labelName = data[0].replace(":", "")
                this.labels.set(labelName, lineno)
                continue
            }

            let commandName = data[0]
            let args = data.slice(1)

            commands.push({
                name: commandName,
                args: args,
                lineno: lineno,
            })
        }

        // Initialize registers
        this.memory.forEach((reg) => {
            exprs.push({
                type: "expression",
                latex: `${reg} = 0`,
            })
        })

        // Transform commands to expressions
        for (let command of commands) {
            let exprsToAdd = []
            // Mov command

            try {
                if (command.name === "mov") { exprsToAdd = this.mov(command.args, command.lineno) }
                else if (command.name === "add") { exprsToAdd = this.add(command.args, command.lineno) }
                else if (command.name === "sub") { exprsToAdd = this.sub(command.args, command.lineno) }
                else if (command.name === "mul") { exprsToAdd = this.mul(command.args, command.lineno) }
                else if (command.name === "div") { exprsToAdd = this.div(command.args, command.lineno) }
                else if (command.name === "je") { exprsToAdd = this.je(command.args, command.lineno) }
                else if (command.name === "jne") { exprsToAdd = this.jne(command.args, command.lineno) }
                else if (command.name === "jmp") { exprsToAdd = this.jmp(command.args, command.lineno) }
                else if (command.name === "sin") { exprsToAdd = this.sin(command.args, command.lineno) }
                else if (command.name === "cos") { exprsToAdd = this.cos(command.args, command.lineno) }
                else if (command.name === "tan") { exprsToAdd = this.tan(command.args, command.lineno) }
                else if (command.name === "lit") { exprsToAdd = this.lit(command.args, command.lineno) }
                else {
                    throw new Error(`Invalid command ${command.name} (${command.lineno})`)
                }
            } catch (e) {
                console.error(e)
                throw new Error(`Error while transforming command ${command.name} (${command.lineno})`)
            }

            exprs = exprs.concat(exprsToAdd)
        }

        // Generate Action table
        let actionTable = []
        this.actionLinenos.forEach((lineno, action) => {
            actionTable.push({
                action: action,
                lineno: lineno,
            })
        })

        actionTable = actionTable.sort((a, b) => a.lineno - b.lineno)

        let actionTableExprBuilder = "F_{a}=\\left\\{"
        for (let action of actionTable) {
            actionTableExprBuilder += `T=${action.lineno}: ${action.action},`
        }
        actionTableExprBuilder = actionTableExprBuilder.slice(0, -1)
        actionTableExprBuilder += "\\right\\},i_{ncrement}"

        exprs.push({
            type: "expression",
            latex: actionTableExprBuilder,
        })

        return exprs
    }
}