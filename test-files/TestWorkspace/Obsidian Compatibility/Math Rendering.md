I should be able to make math blocks:

$$
\begin{vmatrix}a & b\\
c & d
\end{vmatrix}=ad-bc
$$

I should be able to make math blocks inline $$y = 2x$$ (because cross compatibility is a bitch)

"Inline math blocks" that are first on a line should not break:
$$mymath$$

Errors should show up nice:

$$
\begin{vmatrix}a & b\\
c & d
\end{vmatrix}=ad-bc^
$$

Should be able to do inline math: $2^{45}$. Inline math should fail unobnoxiously: $2^$

Should be able to use `mhchem` style equations:
$$
\ce{CO2 + C -> 2 CO}
$$
Should be able to do inline math as the first character of a line:
$math()$