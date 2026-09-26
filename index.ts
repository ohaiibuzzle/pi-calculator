/**
 * Calculator - exact arithmetic for the model
 *
 * Registers a `calculate` tool backed by mathjs so the model evaluates
 * expressions instead of doing mental maths. Numbers are BigNumbers
 * (64 significant digits), so 0.1 + 0.2 = 0.3 and 2^100 is exact.
 * Output is capped a few digits below the working precision so that
 * last-digit rounding noise (1/3*3 = 0.999...9) never reaches the model.
 */

import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { all, create, type FormatOptions } from "mathjs";
import { Type } from "typebox";

const PRECISION = 64;
const OUTPUT_DIGITS = 60;

const math = create(all, { number: "BigNumber", precision: PRECISION });

// Expressions must not be able to reconfigure the instance or re-enter the parser.
// See https://mathjs.org/docs/expressions/security.html
const evaluate = math.evaluate;
const disabled = (name: string) => () => {
	throw new Error(`Function ${name} is disabled`);
};
math.import(
	Object.fromEntries(
		["import", "createUnit", "reviver", "evaluate", "parse", "compile", "simplify", "derivative", "resolve"].map(
			(name) => [name, disabled(name)],
		),
	),
	{ override: true },
);

interface CalcResult {
	expression: string;
	result?: string;
	error?: string;
}

interface CalcDetails {
	results: CalcResult[];
}

function formatValue(value: unknown, precision = OUTPUT_DIGITS): string {
	if ((math.isBigNumber(value) && !value.isFinite()) || (typeof value === "number" && !Number.isFinite(value))) {
		throw new Error(`Result is ${String(value)} (division by zero, overflow, or undefined operation)`);
	}
	const options: FormatOptions = { notation: "auto", lowerExp: -12, upperExp: OUTPUT_DIGITS, precision };
	return math.format(value, options);
}

const calculateTool = defineTool({
	name: "calculate",
	label: "Calculate",
	description: [
		"Evaluate mathematical expressions exactly (mathjs syntax, BigNumber precision, up to 60 significant digits of output).",
		"Supports + - * / ^ % and parentheses, functions (sqrt, cbrt, abs, round, floor, ceil, exp, log, log10, log2,",
		"sin/cos/tan and inverses, factorial, gcd, lcm, mod, min, max, sum, mean, median, std, combinations, ...),",
		"constants (pi, e, phi), unit conversion ('5 km to mi', '72 degF to degC', '3 GiB to MB'),",
		"and variables that persist across the expressions of one call ('r = 4', 'pi * r^2').",
		"Trig functions take radians unless a unit is given ('sin(30 deg)').",
	].join(" "),
	promptSnippet: "Evaluate arithmetic and maths expressions exactly instead of computing them mentally",
	promptGuidelines: [
		"Use calculate for any arithmetic beyond trivial single-digit operations; do not compute results mentally.",
		"Batch related expressions into one calculate call; later expressions can reference variables assigned earlier.",
	],
	parameters: Type.Object({
		expressions: Type.Array(Type.String(), {
			description: "Expressions to evaluate in order, e.g. [\"(1234.5 * 17) / 3\", \"sqrt(2)^3\"]",
			minItems: 1,
			maxItems: 50,
		}),
		precision: Type.Optional(
			Type.Integer({
				description: `Significant digits in the output (default and maximum: ${OUTPUT_DIGITS})`,
				minimum: 1,
				maximum: OUTPUT_DIGITS,
			}),
		),
	}),

	async execute(_toolCallId, params) {
		const scope = new Map<string, unknown>();
		const results: CalcResult[] = params.expressions.map((expression) => {
			try {
				return { expression, result: formatValue(evaluate(expression, scope), params.precision) };
			} catch (err) {
				return { expression, error: err instanceof Error ? err.message : String(err) };
			}
		});

		const text = results.map((r) => `${r.expression} = ${r.error ? `Error: ${r.error}` : r.result}`).join("\n");
		if (results.every((r) => r.error)) throw new Error(text);

		return {
			content: [{ type: "text", text }],
			details: { results } satisfies CalcDetails,
		};
	},

	renderCall(args, theme) {
		const count = args.expressions?.length ?? 0;
		const summary = count === 1 ? args.expressions[0] : `${count} expressions`;
		return new Text(theme.fg("toolTitle", theme.bold("calculate ")) + theme.fg("muted", summary ?? ""), 0, 0);
	},

	renderResult(result, _options, theme) {
		const details = result.details as CalcDetails | undefined;
		if (!details) {
			const text = result.content[0];
			return new Text(text?.type === "text" ? theme.fg("error", text.text) : "", 0, 0);
		}
		const lines = details.results.map(
			(r) =>
				theme.fg("muted", `${r.expression} = `) +
				(r.error ? theme.fg("error", `Error: ${r.error}`) : theme.fg("success", r.result ?? "")),
		);
		return new Text(lines.join("\n"), 0, 0);
	},
});

export default function (pi: ExtensionAPI) {
	pi.registerTool(calculateTool);
}
