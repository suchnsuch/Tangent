<script lang="ts">

export let path: string
export let extension: string = '.jpeg'
export let alt: string = ''

let className = ''
export { className as class }

$: lightPath = path + '-light' + extension
$: lightPath2x = path + '-light-2x' + extension
$: darkPath = path + '-dark' + extension
$: darkPath2x = path + '-dark-2x' + extension

</script>

<picture>
	<source srcset={darkPath + ', ' + darkPath2x + ' 2x'} media="(prefers-color-scheme:dark)" />
	<img class={className} src={lightPath} {alt} srcset={lightPath2x + ' 2x'} />
</picture>
