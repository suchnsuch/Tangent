Tangent supports block-level and inline math with [KaTeX](https://katex.org).

You can write block level math by surrounding your KaTeX source with `$$` characters on their own line:
$$
H = \frac{f^2}{Nc} + f
$$

You can write inline math by surrounding the KaTeX source with single `$` characters, such as: $f(x) = 2x^2$

# Chemical Equations
Tangent also includes the [KaTeX mhchem extensions](https://mhchem.github.io/MathJax-mhchem/) for chemical equations. This provides the `\ce{}` function, and allows for beautiful chemical equations with minimal effort:
$$
\ce{CO2 + C -> 2 CO}
$$