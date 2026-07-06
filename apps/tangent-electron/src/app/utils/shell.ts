const supportedShells = ['bash', 'dash', 'busybox', 'zsh', 'csh', 'cmd', 'powershell']

/**
 * ShellEscape - A class for escaping shell arguments across multiple shells
 * Extracted from shescape library
 */
export class ShellEscape {
    shell: string
    quote: boolean

    /**
     * Create a new ShellEscape instance
     * @param {string} shell - The shell type: 'bash', 'dash', 'busybox', 'zsh', 'csh', 'cmd', 'powershell'
     * @param {boolean} [quote=false] - Whether to quote the argument
     */
    constructor(options: {shell: string, quote: boolean}) {
        this.shell = options.shell.toLowerCase()
        this.quote = options.quote
        this._validateShell()
    }

    _validateShell() {
        if (!supportedShells.includes(this.shell)) {
            throw new Error(`Unsupported shell: ${this.shell}. Supported: ${supportedShells.join(', ')}`)
        }
    }

    /**
     * Escape a single argument
     * @param {string} arg - The argument to escape
     * @returns {string} The escaped argument
     */
    escape(arg) {
        if (typeof arg !== 'string') {
            arg = String(arg)
        }

        if (this.quote) {
            return this._quote(arg)
        }

        return this._escapeUnquoted(arg)
    }

    /**
     * Get the raw escape function for the current shell
     * @returns {Function} The escape function
     */
    getEscapeFunction() {
        switch (this.shell) {
            case 'bash':
            case 'dash':
            case 'busybox':
                return this._escapeBourne
            case 'zsh':
                return this._escapeZsh
            case 'csh':
                return this._escapeCsh
            case 'cmd':
                return this._escapeCmd
            case 'powershell':
                return this._escapePowershell
            default:
                throw new Error(`No escape function for shell: ${this.shell}`)
        }
    }

    /**
     * Get the raw quote function for the current shell
     * @returns {Function} The quote function
     */
    getQuoteFunction() {
        switch (this.shell) {
            case 'bash':
            case 'dash':
            case 'busybox':
                return this._quoteBourne
            case 'zsh':
                return this._quoteZsh
            case 'csh':
                return this._quoteCsh
            case 'cmd':
                return this._quoteCmd
            case 'powershell':
                return this._quotePowershell
            default:
                throw new Error(`No quote function for shell: ${this.shell}`)
        }
    }

    // ============= PRIVATE ESCAPE METHODS =============

    _escapeUnquoted(arg) {
        switch (this.shell) {
            case 'bash':
            case 'dash':
            case 'busybox':
                return this._escapeBourne(arg)
            case 'zsh':
                return this._escapeZsh(arg)
            case 'csh':
                return this._escapeCsh(arg)
            case 'cmd':
                return this._escapeCmd(arg)
            case 'powershell':
                return this._escapePowershell(arg)
            default:
                return arg
        }
    }

    _quote(arg) {
        switch (this.shell) {
            case 'bash':
            case 'dash':
            case 'busybox':
                return this._quoteBourne(arg)
            case 'zsh':
                return this._quoteZsh(arg)
            case 'csh':
                return this._quoteCsh(arg)
            case 'cmd':
                return this._quoteCmd(arg)
            case 'powershell':
                return this._quotePowershell(arg)
            default:
                return arg
        }
    }

    // ============= BOURNE SHELLS (Bash, Dash, BusyBox) =============

    _escapeBourne(arg) {
        const controls = /[\0\u0008\r\u001B\u009B]/g
        const newlines = /\n/g
        const backslashes = /\\/g
        const comments = /(^|\s)#/g
        const home = /(^|[\s:=])~/g
        const specials = /(["$&'()*<>?[\]`{|])/g
        const whitespace = /([\t ])/g

        return arg
            .replaceAll(controls, '')
            .replaceAll(newlines, ' ')
            .replaceAll(backslashes, '\\\\')
            .replaceAll(comments, '$1\\#')
            .replaceAll(home, '$1\\~')
            .replaceAll(specials, '\\$1')
            .replaceAll(whitespace, '\\$1')
    }

    _quoteBourne(arg) {
        const controls = /[\0\u0008\u001B\u009B]/g
        const crs = /(\r\n)|\r/g
        const quotes = /'/g

        const escaped = arg
            .replaceAll(controls, '')
            .replaceAll(crs, '$1')
            .replaceAll(quotes, "'\\''")

        return `'${escaped}'`
    }

    // ============= ZSH =============

    _escapeZsh(arg) {
        const controls = /[\0\u0008\r\u001B\u009B]/g
        const newlines = /\n/g
        const backslashes = /\\/g
        const comments = /(^|\s)#/g
        const expansions = /(^|\s)([=~])/g
        const specials = /(["$&'()*<>?[\]`{|}])/g
        const whitespace = /([\t ])/g

        return arg
            .replaceAll(controls, '')
            .replaceAll(newlines, ' ')
            .replaceAll(backslashes, '\\\\')
            .replaceAll(comments, '$1\\#')
            .replaceAll(expansions, '$1\\$2')
            .replaceAll(specials, '\\$1')
            .replaceAll(whitespace, '\\$1')
    }

    _quoteZsh(arg) {
        const controls = /[\0\u0008\u001B\u009B]/g
        const crs = /(\r\n)|\r/g
        const quotes = /'/g

        const escaped = arg
            .replaceAll(controls, '')
            .replaceAll(crs, '$1')
            .replaceAll(quotes, "'\\''")

        return `'${escaped}'`
    }

    // ============= CSH =============

    _escapeCsh(arg) {
        const controls = /[\0\u0008\r\u001B\u009B]/g
        const newlines = /\n/g
        const backslashes = /\\/g
        const home = /(^|\s)~/g
        const history = /!/g
        const specials = /(["#$&'()*<>?[`{|])/g
        const whitespace = /([\t ])/g
        const textEncoder = new TextEncoder()

        let result = arg
            .replaceAll(controls, '')
            .replaceAll(newlines, ' ')
            .replaceAll(backslashes, '\\\\')
            .replaceAll(home, '$1\\~')
            .replaceAll(history, '\\!')
            .replaceAll(specials, '\\$1')
            .replaceAll(whitespace, '\\$1')

        // Fix for csh bug: escape characters with byte 0xA0
        result = result
            .split('')
            .map((char) => (textEncoder.encode(char).includes(160) ? `'${char}'` : char))
            .join('')

        return result
    }

    _quoteCsh(arg) {
        const controls = /[\0\u0008\r\u001B\u009B]/g
        const newlines = /\n/g
        const quotes = /'/g
        const history = /!/g

        const escaped = arg
            .replaceAll(controls, '')
            .replaceAll(newlines, ' ')
            .replaceAll(quotes, "'\\''")
            .replaceAll(history, '\\!')

        return `'${escaped}'`
    }

    // ============= CMD (Windows Command Prompt) =============

    _escapeCmd(arg) {
        const controls = /[\0\u0008\r\u001B\u009B]/g
        const newlines = /\n/g
        const specials = /([%&<>^|])/g
        const quotes = /"/g
        const backslashes = /(^|[^\\])(\\*)\0/g

        return arg
            .replaceAll(controls, '')
            .replaceAll(newlines, ' ')
            .replaceAll(specials, '^$1')
            .replaceAll(quotes, '\0\\^"')
            .replaceAll(backslashes, '$1$2$2')
    }

    _quoteCmd(arg) {
        const controls = /[\0\u0008\r\u001B\u009B]/g
        const newlines = /\n/g
        const quotes = /"/g
        const specials = /([%&<>^|])/g
        const backslashes = /(^|[^\\])(\\+)("|$)/g

        const escaped = arg
            .replaceAll(controls, '')
            .replaceAll(newlines, ' ')
            .replaceAll(quotes, '""')
            .replaceAll(specials, '"^$1"')
            .replaceAll(backslashes, '$1$2$2$3')

        return `"${escaped}"`
    }

    // ============= POWERSHELL =============

    _escapePowershell(arg) {
        const controls = /[\0\u0008\r\u001B\u009B]/g
        const newlines = /\n/g
        const backticks = /`/g
        const redirects = /(^|[\s\u0085])([*1-6]?)(>)/g
        const specials1 = /(^|[\s\u0085])([#\-:<@\]])/g
        const specials2 = /([$&'(),{|}‘’‚‛“”„])/g
        const quote = /"/g
        const backslashBeforeQuote = /(^|[^\\])(\\*)\0/g
        const backslashSuffix = /([^\\])(\\+)$/
        const whitespace = /([\s\u0085])/g
        const whitespacePrefix = /^[\s\u0085]+/

        let result = arg
            .replaceAll(controls, '')
            .replaceAll(newlines, ' ')
            .replaceAll(backticks, '``')
            .replaceAll(redirects, '$1$2`$3')
            .replaceAll(specials1, '$1`$2')
            .replaceAll(specials2, '`$1')

        if (whitespace.test(result.replace(whitespacePrefix, ''))) {
            result = result
                .replaceAll(quote, '\0`"`"')
                .replaceAll(backslashBeforeQuote, '$1$2$2')
                .replace(backslashSuffix, '$1$2$2')
        } else {
            result = result
                .replaceAll(quote, '\0\\`"')
                .replaceAll(backslashBeforeQuote, '$1$2$2')
        }

        result = result.replaceAll(whitespace, '`$1')
        return result
    }

    _quotePowershell(arg) {
        const controls = /[\0\u0008\u001B\u009B]/g
        const crs = /(\r\n)|\r/g
        const quotes = /(['‘’‚‛])/g
        const quote = /"/g
        const backslashBeforeQuote = /(^|[^\\])(\\*)\0/g
        const backslashSuffix = /([^\\])(\\+)$/
        const whitespace = /[\s\u0085]/

        let result = arg
            .replaceAll(controls, '')
            .replaceAll(crs, '$1')
            .replaceAll(quotes, '$1$1')

        if (whitespace.test(result)) {
            result = result
                .replaceAll(quote, '\0""')
                .replaceAll(backslashBeforeQuote, '$1$2$2')
                .replace(backslashSuffix, '$1$2$2')
        } else {
            result = result
                .replaceAll(quote, '\0\\"')
                .replaceAll(backslashBeforeQuote, '$1$2$2')
        }

        return `'${result}'`
    }
}
