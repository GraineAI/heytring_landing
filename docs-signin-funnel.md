# Finding the 85%

`260 installed → 47 signed in.` Android `174 → 21`. iOS `86 → 26`.

The dashboard can prove people are lost. It cannot yet say **where**, because
between `Application Opened` and `$identify` the app emits nothing. That gap is
the single most valuable missing measurement in the product.

## What the app must emit

Six events, no properties required beyond what PostHog already attaches. Fire
them from the **screen**, not from the network callback, so a person who stares
at a screen and quits is still counted.

| event | fire when |
|---|---|
| `signin_phone_shown`   | the phone-number screen renders |
| `signin_phone_submit`  | they press continue with a number |
| `signin_otp_shown`     | the OTP screen renders |
| `signin_otp_submit`    | they submit any code |
| `signin_otp_failed`    | the code is rejected — include `reason` |
| `signin_success`       | session established (alongside `$identify`) |

Then the funnel reads: shown → submitted → OTP shown → OTP submitted → succeeded.
Whichever arrow collapses is the bug. Today all five are invisible.

## Why it is probably not one bug

The two platforms lose people at different rates — Android converts 12% of
openers, iOS 30%. A single shared backend bug would hurt both equally. A 2.5x
gap points at something client-side and platform-specific: SMS autofill, the
permission prompt, or the keyboard covering the field.

`signin_otp_failed` with a `reason` separates "our SMS never arrived" from
"they typed it wrong" — a distinction worth more than any amount of guessing.

## What not to do first

Do not spend on acquisition until this is fixed. At 12% activation, every
100 new Android installs buys 12 users and wastes 88. Fix the leak, then fill
the bucket.

## The parallel move

Instrumentation tells you *where*. It cannot tell you *why*. The waitlist has
names, emails and devices — call the people who installed and never signed in
and ask what they saw. Ten calls will beat a week of dashboards, and the admin
now has a place to write the answers down (Talk to your users).
