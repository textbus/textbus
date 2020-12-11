import { makeClassDecorator, Provider, TypeDecorator } from '@tanbo/di';
import { Lifecycle } from '../lifecycle';
import { ComponentReader } from '../component';

export interface Component {
  reader: ComponentReader;
  lifecycle?: Lifecycle<any>;
  providers?: Provider[];
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
