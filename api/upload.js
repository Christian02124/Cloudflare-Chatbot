const uploadPDF = async (file) => {
  if (!file) return;

  setPdfName(file.name);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: file,
    });

    const data = await res.json();

    setPdfText(data.text);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `PDF "${file.name}" berhasil dibaca ✅`,
      },
    ]);
  } catch (err) {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Gagal membaca PDF ❌",
      },
    ]);
  }
};