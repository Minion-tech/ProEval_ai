import { Hero } from "./components/hero"
import { ProductPreview } from "./components/product-preview"
import { WhatIsProEval } from "./sections/what-is-proeval"
import { Problem } from "./sections/problem"
import { Solution } from "./sections/solution"
import { Workflow } from "./components/workflow"
import { KeyFeatures } from "./sections/key-features"
import { HowItWorks } from "./components/how-it-works"
import { CTA } from "./components/cta"

// Reuses existing editorial sections — preserves content, Spotlight, and links.
export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Hero />
      <ProductPreview />
      <WhatIsProEval />
      <Problem />
      <Solution />
      <Workflow />
      <KeyFeatures />
      <HowItWorks />
      <CTA />
    </div>
  )
}
