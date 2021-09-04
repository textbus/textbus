import {
  Type, BranchAbstractComponent,
  DivisionAbstractComponent,
  TBRange,
  BackboneAbstractComponent
} from '@textbus/core';

export function rangeContentInComponent(range: TBRange,
                                        componentConstructorList: Array<Type<BranchAbstractComponent | DivisionAbstractComponent | BackboneAbstractComponent>> = []) {
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
