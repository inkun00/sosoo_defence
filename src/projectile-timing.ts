/** A 20% increase in travel speed takes 1 / 1.2 of the previous flight time.
 * The caller keeps its own units: tower profiles use ms, siege shots use s. */
export const PROJECTILE_SPEED_MULTIPLIER=1.2;
export function projectileTravelTime(duration:number):number{return duration/PROJECTILE_SPEED_MULTIPLIER;}
