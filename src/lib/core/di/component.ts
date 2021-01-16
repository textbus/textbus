import { makeClassDecorator, TypeDecorator } from '@tanbo/di';
import { Interceptor } from '../interceptor';
import { ComponentLoader } from '../component';
import { ComponentSetter } from '../component-setter';

export interface Component {
  loader: ComponentLoader;
  interceptor?: Interceptor<any>;
  setter?: ComponentSetter<any>;
  styles?: string[];
  editModeStyles?: string[];
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
