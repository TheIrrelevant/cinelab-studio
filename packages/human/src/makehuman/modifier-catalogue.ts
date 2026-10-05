/**
 * @file modifier-catalogue.ts
 * @description Local body and head modifiers built from MakeHuman's target.json (plan 2.1). Each
 *   category becomes a modifier: bipolar (-1..1 between a decrease and an increase target) or
 *   unipolar (0..1, one target, e.g. face shapes), optionally with left/right targets. Pack target
 *   names are `<group>/<target>`. Shared by the converter and the runtime (no Node imports).
 * @scope cinelab-studio
 * @depends none
 */

export type ModifierSection = "body" | "head";
export type ModifierEnds = { left?: string; right?: string; unsided?: string };
export type Modifier = {
  /** `<group>/<category name>`, e.g. `nose/nose-trans-up-down`. */
  id: string;
  group: string;
  section: ModifierSection;
  label: string;
  kind: "bipolar" | "unipolar";
  sided: boolean;
  /** Targets for values below 0 (bipolar only). */
  negative: ModifierEnds;
  /** Targets for values above 0. */
  positive: ModifierEnds;
  /** Words naming the two ends, e.g. ["decr", "incr"] (bipolar only). */
  ends: [string, string] | null;
};

type Opposites = Record<"negative-left" | "negative-right" | "negative-unsided" | "positive-left" | "positive-right" | "positive-unsided", string>;
type Category = { name: string; has_left_and_right: boolean; opposites?: Opposites; targets: string[] };
export type TargetJson = Record<string, { categories: Category[] }>;

/** Groups shown in the Head tab; every other modifier group belongs to the Body tab. */
export const HEAD_GROUPS = ["head", "forehead", "eyebrows", "eyes", "nose", "cheek", "mouth", "chin", "ears", "neck"];

const ends = (group: string, o: Opposites, sign: "negative" | "positive"): ModifierEnds => {
  const pick = (key: keyof Opposites) => (o[key] ? `${group}/${o[key]}` : undefined);
  return { left: pick(`${sign}-left`), right: pick(`${sign}-right`), unsided: pick(`${sign}-unsided`) };
};

/** Splits `nose-trans-up` / `nose-trans-down` into base `nose-trans` and words `down`, `up`. */
function splitEnds(negative: string, positive: string): { base: string; words: [string, string] } {
  const strip = (name: string) => name.replace(/^[lr]-/, "");
  const [n, p] = [strip(negative), strip(positive)];
  let i = 0;
  while (i < n.length && n[i] === p[i]) i += 1;
  const cut = n.lastIndexOf("-", i - 1);
  return { base: n.slice(0, cut), words: [n.slice(cut + 1), p.slice(cut + 1)] };
}

/** Human label: base words without the group or `measure` word, digits split off, first letter upper case. */
export function modifierLabel(group: string, base: string): string {
  const stem = group.replace(/s$/, "");
  const words = base.split("-").filter((word, i) => !(i === 0 && (word === group || word === stem || word === "measure")));
  const text = (words.length ? words : base.split("-")).join(" ").replace(/([a-z])(\d)/g, "$1 $2");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildCatalogue(json: TargetJson, groups: readonly string[]): Modifier[] {
  return groups.flatMap((group) =>
    (json[group]?.categories ?? []).map((category): Modifier => {
      const section: ModifierSection = HEAD_GROUPS.includes(group) ? "head" : "body";
      const id = `${group}/${category.name}`;
      if (!category.opposites) {
        const [target] = category.targets;
        return { id, group, section, label: modifierLabel(group, target), kind: "unipolar", sided: false, negative: {}, positive: { unsided: `${group}/${target}` }, ends: null };
      }
      const o = category.opposites;
      const sided = category.has_left_and_right;
      const { base, words } = splitEnds(sided ? o["negative-left"] : o["negative-unsided"], sided ? o["positive-left"] : o["positive-unsided"]);
      return { id, group, section, label: modifierLabel(group, base), kind: "bipolar", sided, negative: ends(group, o, "negative"), positive: ends(group, o, "positive"), ends: words };
    }),
  );
}

/** Every pack target name referenced by the catalogue. */
export function catalogueTargets(catalogue: readonly Modifier[]): string[] {
  const names = catalogue.flatMap((m) => [m.negative, m.positive].flatMap((e) => [e.left, e.right, e.unsided]));
  return [...new Set(names.filter((name): name is string => Boolean(name)))];
}

/** Breast cup/firmness macro target files (adult female), e.g. `female-young-...-maxcup-minfirmness`. */
export const isBreastMacro = (file: string) => /^female-(young|old)-.*cup-.*firmness$/.test(file);
