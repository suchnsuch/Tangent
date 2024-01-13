Here is some leading text	

```js
let us = make.some()
class Fancy {
	constructor(foo) {
		this.foo = foo
	}
}
let js = new Fancy('Javascript') // Comment
```

Here is some trailing text.

```ts
// Here is some typescript, which needs to be refreshed
// once code is loaded
export default class MyClass extends MyOtherClass {
	myValue: string,
	myOtherValue: 'foo' | 'bar'
}
```

```html
<div class="value"></div>
```

This is some text that should be consumed by opening up the code above.

Here is some code that is not specified
```
This is raw code with no language specifier. I can just type here forever and nothing will come of it. The entire page is scrolling and I don't think that's intentional.
```

Here is some svelte code
```svelte
<script>
let list = ['doom', 'gloom']
</script>

{#each list as item}
	<div>{item}</div>
{/each}
```

Here is some c++ code. It depends on the c module, which depends on the clike module.
```cpp
class MyFancyClass
{
	void DoThing();
};
```

Here is some code with very long lines:
```cpp
float CritiallyDampedSpringInterpolation(float current, float target, float deltaTime, ref float velocity, float springConstant)
{
	float denominatorSquareRoot = 1 + springConstant * deltaTime;
	float newVelocity = (velocity - (springConstant * springConstant) * deltaTime * (current - target)) / (denominatorSquareRoot * denominatorSquareRoot);
	float result = current + (velocity + newVelocity) * 0.5f * deltaTime;
	velocity = newVelocity;
	return result;
}
```

Here is some code with slightly shorter lines:
```cpp
float CritiallyDampedSpringInterpolation(float current, float target, float deltaTime,
	ref float velocity, float springConstant)
{
	float denominatorSquareRoot = 1 + springConstant * deltaTime;
	float newVelocity = (velocity - (springConstant * springConstant) * deltaTime * (current - target))
		/ (denominatorSquareRoot * denominatorSquareRoot);
	float result = current + (velocity + newVelocity) * 0.5f * deltaTime;
	velocity = newVelocity;
	return result;
}
```