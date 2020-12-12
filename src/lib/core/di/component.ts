import { makeClassDecorator, TypeDecorator } from '@tanbo/di';
import { Interceptor } from '../interceptor';
import { ComponentLoader } from '../component';

export interface Component {
  loader: ComponentLoader;
  interceptor?: Interceptor<any>;
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
