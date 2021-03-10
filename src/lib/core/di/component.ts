import { makeClassDecorator, TypeDecorator, Provider } from '@tanbo/di';
import { ComponentLoader } from '../component';

export interface Component {
  loader: ComponentLoader;
  links?: Array<{[key: string]: string}>;
  styles?: string[];
  scripts?: string[];
  editModeStyles?: string[];
  providers?: Provider[];
}

export interface ComponentDecorator {
  (define: Component): TypeDecorator;

  new(define: Component): Component;
}

export const Component: ComponentDecorator = function ComponentDecorator(define: Component): ClassDecorator {
  if (!(this instanceof ComponentDecorator)) {
    return makeClassDecorator(ComponentDecorator, null, define);
  }
} as ComponentDecorator;
