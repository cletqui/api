interface Response {
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  id: number;
  entry_timestamp: string | null;
  not_before: string;
  not_after: string;
  serial_number: string;
  result_count: number;
}

export async function query(
  domain: string,
  exclude?: string,
  deduplicate?: string
): Promise<Response[]> {
  const url = new URL(`https://crt.sh/?q=${domain}&output=json`);
  exclude && url.searchParams.append("exclude", exclude);
  deduplicate && url.searchParams.append("deduplicate", deduplicate);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch data: ${response.status} ${response.statusText}`
    );
  } // TODO handle returned errors
  return (await response.json()) as Response[];
}
