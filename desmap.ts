import {Expr} from "./app";

export let parseBlock = async (block: string[]): Promise<Expr> => {
    let tex = block[0];

    if (block.length > 1) {
        return {
            type: "expression",
            latex: tex,
            clickableInfo: {
                enabled: true,
                latex: block[1].slice(2)
            }
        }
    }

    return {
        type: "expression",
        latex: tex,
    }
}