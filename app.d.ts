export type AnyExpr = {
    type: "expression"
}

export type MathExpr = {
    "latex": string,
} & AnyExpr

export type MathClickableExpr = {
    clickableInfo: {
        enabled: boolean,
        latex: string,
    }
} & MathExpr

export type Expr = MathExpr | MathClickableExpr

export type Command = {
    name: string,
    args: string[],
    lineno: number,
}