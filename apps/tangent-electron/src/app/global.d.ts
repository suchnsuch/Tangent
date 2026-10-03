declare type DndEvent = import("svelte-dnd-action").DndEvent;
declare namespace svelte.JSX {
    interface HTMLAttributes<T> {
        onconsider?: (event: CustomEvent<DndEvent> & {target: EventTarget & T}) => void;
        onfinalize?: (event: CustomEvent<DndEvent> & {target: EventTarget & T}) => void;
    }
}
declare module 'virtual:prism-languages' {
	/** Language name to a loader for its prism definition. */
	const languageModules: Record<string, () => Promise<unknown>>
	export default languageModules
}
