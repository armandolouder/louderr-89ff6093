type AccountAuth = {
  updateUser: (attributes: { password: string; current_password: string }) => Promise<{ error: { code?: string; message: string } | null }>;
  signOut: (options: { scope: "local" }) => Promise<{ error: { message: string } | null }>;
};

export async function changeAccountPassword(auth: Pick<AccountAuth, "updateUser">, currentPassword: string, password: string, confirmation: string) {
  if (!currentPassword || !password || !confirmation) throw new Error("Preencha todos os campos.");
  if (password.length < 6) throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
  if (password !== confirmation) throw new Error("As senhas não coincidem.");
  if (password === currentPassword) throw new Error("Escolha uma senha diferente da atual.");
  const { error } = await auth.updateUser({ password, current_password: currentPassword });
  if (!error) return;
  if (error.code === "weak_password") throw new Error("Escolha uma senha mais forte e que não tenha sido exposta em vazamentos.");
  if (error.code === "same_password") throw new Error("Escolha uma senha diferente da atual.");
  if (error.code === "reauthentication_needed" || /current password|invalid.*credentials/i.test(error.message)) throw new Error("A senha atual está incorreta. Confira e tente novamente.");
  throw new Error("Não foi possível alterar a senha. Confira a senha atual ou entre novamente na conta.");
}

export async function endAccountSession(auth: Pick<AccountAuth, "signOut">, clearAccountData: () => void, goToLogin: () => void) {
  const { error } = await auth.signOut({ scope: "local" });
  if (error) throw new Error("Não foi possível sair. Tente novamente.");
  clearAccountData();
  goToLogin();
}