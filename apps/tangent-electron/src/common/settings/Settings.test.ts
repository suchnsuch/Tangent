import Settings from './Settings'
import Setting from './Setting'

describe('Setting serialization', () => {
	test('Setting does not send files for changes', () => {
		const setting = new Setting({
			defaultValue: 'foo'
		})

		expect(setting.value).toEqual('foo')
		expect(setting.getRawValues('file')).toBeUndefined()
	})

	test('Settings do not store default values', () => {
		const settings = new Settings()
		const raw = settings.getRawValues('file') as any
		expect(raw?.updateChannel).toBeUndefined
	})
})
