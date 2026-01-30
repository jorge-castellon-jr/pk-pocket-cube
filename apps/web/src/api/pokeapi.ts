const POKEAPI_BASE = "https://pokeapi.co/api/v2";

type EvolutionChainLink = {
  species: { name: string };
  evolves_to: EvolutionChainLink[];
};

type EvolutionChainResponse = {
  chain: EvolutionChainLink;
};

type PokemonSpeciesResponse = {
  evolution_chain: { url: string };
};

export function normalizePokemonName(name: string) {
  return name
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/\./g, "")
    .replace(/\bex\b/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function findEvolutionNode(
  node: EvolutionChainLink,
  target: string
): EvolutionChainLink | null {
  if (node.species.name === target) return node;
  for (const child of node.evolves_to) {
    const found = findEvolutionNode(child, target);
    if (found) return found;
  }
  return null;
}

function findParentName(
  node: EvolutionChainLink,
  target: string,
  parent: string | null = null
): string | null {
  if (node.species.name === target) return parent;
  for (const child of node.evolves_to) {
    const found = findParentName(child, target, node.species.name);
    if (found) return found;
  }
  return null;
}

function collectChainNames(node: EvolutionChainLink, list: string[] = []) {
  list.push(node.species.name);
  if (node.evolves_to.length === 0) return list;
  node.evolves_to.forEach((child) => collectChainNames(child, list));
  return list;
}

export async function fetchEvolutionData(pokemonName: string) {
  const normalized = normalizePokemonName(pokemonName);
  const speciesRes = await fetch(`${POKEAPI_BASE}/pokemon-species/${normalized}`);
  if (!speciesRes.ok) {
    throw new Error(`PokeAPI species failed: ${speciesRes.status}`);
  }
  const species = (await speciesRes.json()) as PokemonSpeciesResponse;
  const chainRes = await fetch(species.evolution_chain.url);
  if (!chainRes.ok) {
    throw new Error(`PokeAPI chain failed: ${chainRes.status}`);
  }
  const chain = (await chainRes.json()) as EvolutionChainResponse;
  const currentNode = findEvolutionNode(chain.chain, normalized);
  const evolvesToNames = currentNode
    ? currentNode.evolves_to.map((node) => node.species.name)
    : [];
  const evolvesFromName = findParentName(chain.chain, normalized);
  const chainNames = Array.from(
    new Set(collectChainNames(chain.chain))
  );

  return {
    evolvesFromName,
    evolvesToNames,
    chainNames,
  };
}
