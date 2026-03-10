function isValidCPF(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cpf[10]);
}

function isValidCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calcDigit = (str: string, weights: number[]) => {
    const sum = str
      .split('')
      .reduce((acc, val, i) => acc + parseInt(val) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(cnpj.slice(0, 12), weights1);
  const d2 = calcDigit(cnpj.slice(0, 13), weights2);

  return d1 === parseInt(cnpj[12]) && d2 === parseInt(cnpj[13]);
}

export function validateDocument(document: string): void {
  const cleaned = document.replace(/\D/g, '');
  if (cleaned.length === 11) {
    if (!isValidCPF(cleaned)) throw new Error('CPF inválido');
  } else if (cleaned.length === 14) {
    if (!isValidCNPJ(cleaned)) throw new Error('CNPJ inválido');
  } else {
    throw new Error(
      'Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)',
    );
  }
}
