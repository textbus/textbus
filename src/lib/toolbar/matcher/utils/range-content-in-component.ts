import {
  BranchComponent,
  DivisionComponent,
  Constructor,
  TBRange,
  BackboneComponent
} from '../../../core/_api';

export function rangeContentInComponent(range: TBRange,
                                        componentConstructorList: Array<Constructor<BranchComponent | DivisionComponent | BackboneComponent>> = []) {
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
