/**
 * Base class for value objects: immutable, compared by structural value.
 *
 * Subclasses hold their data under `props` and implement domain invariants in
 * their factory/constructor (throwing a `ValidationError` on violation).
 */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  equals(other?: ValueObject<TProps>): boolean {
    if (other === undefined || other === null) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
