# Amazon OneLink audit — 2026-10-13

## Verified account configuration

The signed-in Amazon.de PartnerNet dashboard was inspected for FigForge:

- Primary Amazon.de store ID: `seitenhafen36-21`
- Website tracking ID: `figforge-21`
- Linked United States store ID: `seitenhafen36-20`
- Redirect preference for `figforge-21`: **Close match** (`Hohe Übereinstimmung`)
- Germany is the primary region and the United States is the linked destination.

The tracking and store IDs are public identifiers, not credentials. FigForge
therefore versions them in `src/procurement/amazon-config.ts`, matching the
established StargazingIndex integration pattern. Passwords, API credentials,
payment details, and tax information are not stored in the repository.

## Website implementation

FigForge publishes full Amazon.de search links in this form:

```text
https://www.amazon.de/s?k=<encoded-query>&tag=figforge-21
```

OneLink remains responsible for eligible marketplace redirects and for
substituting the linked destination tracking ID. FigForge must not replace the
German source tag with the US destination store ID.

## Limits

- A German browser correctly remains on Amazon.de and cannot prove the
  experience from a US IP address.
- Product matching, availability, and redirect behavior remain controlled by
  Amazon and can change.
- The application does not display Amazon prices, ratings, availability, or
  copied product media.

## Official references

- [Amazon.de OneLink FAQ](https://partnernet.amazon.de/help/node/topic/G8JHEWQ9GTDUN7EH)
- [Amazon.de OneLink integration guide](https://partnernet.amazon.de/help/node/topic/GKHRXG4YEJBTCAFC)
- [Amazon link-tag verification](https://partnernet.amazon.de/help/node/topic/G6253GFSARDQENZR)
