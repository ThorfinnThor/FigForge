export const PICK_A_BRICK_URL = "https://www.lego.com/pick-and-build/pick-a-brick";
export const REBRICKABLE_URL = "https://rebrickable.com/users/_ME_/partlists/";

export type ShopLink = {
  href: string;
  /** True when the link runs through a configured partner programme and must be labelled as advertising. */
  affiliate: boolean;
};

/**
 * Applies a partner-link template such as `https://partner.example/deeplink?id=…&murl={url}`.
 * The template is build configuration only; without a valid https template the shop is linked directly.
 */
export const applyAffiliateTemplate = (targetUrl: string, template: string | undefined): ShopLink => {
  const trimmed = template?.trim();
  if (!trimmed || !trimmed.includes("{url}")) return { href: targetUrl, affiliate: false };
  const href = trimmed.replaceAll("{url}", encodeURIComponent(targetUrl));
  try {
    const parsed = new URL(href);
    return parsed.protocol === "https:" ? { href, affiliate: true } : { href: targetUrl, affiliate: false };
  } catch {
    return { href: targetUrl, affiliate: false };
  }
};
