# Stripe test cards

These cards only work with Stripe **test keys** (`sk_test_...` on the server, `pk_test_...` in the web build). No real
money is charged. In the card form, use any future expiry date (for example `12/34`), any 3-digit CVC (`123`) and
any postal code.

| Card number | What happens |
|---|---|
| `4242 4242 4242 4242` | The payment succeeds |
| `4000 0025 0000 3155` | Asks for a bank check (3D Secure) before succeeding |
| `4000 0000 0000 9995` | Declined: insufficient funds |
| `4000 0000 0000 0002` | Declined: card refused |

More cases (expired card, wrong CVC, disputes...) are listed at https://docs.stripe.com/testing.

Setup of the keys and of the optional webhook: see "Pay with Stripe (test mode)" in the [README](../README.md).
