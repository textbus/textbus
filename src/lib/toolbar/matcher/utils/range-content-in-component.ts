import {
  BranchAbstractComponent,
  DivisionAbstractComponent,
  Constructor,
  TBRange,
  BackboneAbstractComponent
} from '../../../core/_api';

export function rangeContentInComponent(range: TBRange,
                                        componentConstructorList: Array<Constructor<BranchAbstractComponent | DivisionAbstractComponent | BackboneAbstractComponent>> = []) {
  let has = true;
  if (componentConstructorList.length === 0) {
    return false;
  }
  forA: for (const t of componentConstructorList) {
    const scopes = range.getSuccessiveContents();
    for (const scope of scopes) {
      if (!scope.fragment.getContext(t)) {
        has = false;
        break forA;
      }
    }
  }
  return has;
}
