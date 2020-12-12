import { makeClassDecorator, Provider, TypeDecorator } from '@tanbo/di';
import { EditActionInterceptor } from '../edit-action-interceptor';
import { ComponentReader } from '../component';

export interface Component {
  reader: ComponentReader;
  editActionInterceptor?: EditActionInterceptor<any>;
}

export interface ComponentDecorator {
  (define: Component): TypeDecorator;

  new(define: Component): Component;
}

export const Component: ComponentDecorator = function ComponentDecorator(define: Component): ClassDecorator {
  if (!(this instanceof ComponentDecorator)) {
    return makeClassDecorator(ComponentDecorator, define);
  }
} as ComponentDecorator;
