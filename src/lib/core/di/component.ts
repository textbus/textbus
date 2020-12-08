import { makeClassDecorator, Provider, TypeDecorator } from '@tanbo/di';
import { Lifecycle } from '../lifecycle';

export interface Component {
  lifecycle?: Lifecycle;
  providers?: Provider[];
}

export interface ComponentDecorator {
  (define: Component): TypeDecorator;

  new(define: Component): Component;
}

export const Component: ComponentDecorator = function ComponentDecorator(define: Component): ClassDecorator {
  if (this instanceof ComponentDecorator) {
    this.define = define
  } else {
    return makeClassDecorator(ComponentDecorator, new Component(define));
  }
} as ComponentDecorator;
