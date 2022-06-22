import { 
	Content, 
	ContentType, 
	ComponentInstance, 
	defineComponent, 
	jsx, 
	NullInjector, 
	ReflectiveInjector 
} from "@textbus/core";


describe('Content', () => {
	let content: Content
	let instance: ComponentInstance
	const injector = new ReflectiveInjector(new NullInjector(), [])
	const component = defineComponent({
		type: ContentType.InlineComponent,
		name: "Test",
		setup () {
			return {
				render () {
					return jsx('p')
				}
			}
		}
	})

	beforeEach(() => {
		content = new Content();
		instance = component.createInstance(injector);
	})

	test('test append', () => {
		content.append("textbus")
		expect(content.length).toEqual(7)
		content.append(instance)
		expect(content.length).toEqual(8)
		content.append("a")
		expect(content.length).toEqual(9)
		content.append("a")
		expect(content.length).toEqual(10)
		expect(content.slice()).toEqual(["textbus", instance, "aa"])
	})

	test('test insert', () => {
		content.append("aa")
		content.insert(0, instance)
		content.insert(0, "bb")
		expect(content.slice()).toEqual(["bb", instance, "aa"])
		content.insert(2, "cc")
		content.insert(0, "cc")
		expect(content.slice()).toEqual(["ccbbcc", instance, "aa"])
		content.insert(content.length + 1, "bb")
		expect(content.slice()).toEqual(["ccbbcc", instance, "aabb"])
	})

	test('test cut', () => {
		content.append("textbus")
		expect(content.cut(0, 4)).toEqual(["text"])
		expect(content.toString()).toEqual("bus")
		content.cut(4, 4)
		expect(content.toString()).toEqual("bus")
		content.cut(2)
		expect(content.toString()).toEqual("bu")
		content.cut()
		expect(content.toString()).toEqual("")
		content.append("test")
		content.append(instance)
		expect(content.cut()).toEqual(["test", instance])
	})

	test('test slice', () => {
		content.append("textbus")
		expect(content.slice()).toStrictEqual(["textbus"])
		expect(content.slice(-1, 4)).toStrictEqual(["text"])
		expect(content.slice(4, 4)).toStrictEqual([])
		expect(content.slice(6, 7)).toStrictEqual(["s"])
		expect(content.slice(7, 8)).toStrictEqual([])
		content.append(instance)
		expect(content.slice(6, 8)).toStrictEqual(["s", instance])
	})

	test('test indexOf', () => {
		content.append("aa")
		content.append(instance)
		expect(content.indexOf(instance)).toEqual(2)
		content.insert(0, "bb")
		expect(content.indexOf(instance)).toEqual(4)
	})

	test('test getContentAtIndex', () => {
		content.append("aa")
		content.append(instance)
		content.append("bb")
		expect(content.getContentAtIndex(-1)).toEqual(undefined)
		expect(content.getContentAtIndex(0)).toEqual("a")
		expect(content.getContentAtIndex(1)).toEqual("a")
		expect(content.getContentAtIndex(2)).toEqual(instance)
		expect(content.getContentAtIndex(3)).toEqual("b")
		expect(content.getContentAtIndex(4)).toEqual("b")
		expect(content.getContentAtIndex(5)).toEqual(undefined)
	})

})