export async function fetchFromOFF(ean) {
  try {
    const res = await fetch(`/api/lookup-product?ean=${ean}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
