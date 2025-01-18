# Project Structure Mapping

## Directory Tree Diagram

```
/chinese-marketplace
├── .gitignore
├── chinese_marketplace_research.txt
├── chinese-marketplace.code-workspace
├── jest.config.js
├── package-lock.json
├── package.json
├── Project_Overview_2.md
├── project_progress.txt
├── README.md
├── requirements.txt
├── TODO.md
├── tsconfig.json
├── webpack.config.js
├── config/
│   ├── webpack.common.js
│   ├── webpack.dev.js
│   └── webpack.prod.js
├── coverage/
├── development/
│   ├── mvp_structure.md
│   ├── project_structure.md
│   ├── testing_extensions.md
│   ├── testing_plan.md
│   ├── testing_strategy.md
│   └── week1_tasks.md
│   ├── backend/
│   │   ├── jest.config.js
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── scamDetection.js
│   │   │   └── sellerProfile.js
│   │   └── tests/
│   │       ├── scamDetection.test.js
│   │       ├── sellerProfile.test.js
│   │       └── setup.js
│   └── frontend/
│       ├── app.js
│       ├── index.html
│       └── styles.css
├── public/
│   ├── popup.html
│   ├── icons/
│   └── styles/
├── research/
│   ├── README_updated.md
│   ├── README.md
│   ├── research_plan.md
│   ├── task_division.md
│   ├── unique_challenges.md
│   ├── ai_queries/
│   ├── competitors/
│   │   └── research_plan.md
│   ├── features/
│   │   ├── implementation_roadmap.md
│   │   └── innovative_features.md
│   ├── findings/
│   │   ├── comprehensive_analysis.md
│   │   ├── key_opportunities.md
│   │   ├── security_and_implementation.md
│   │   └── user_experience_and_competition.md
│   ├── market_research/
│   │   ├── search_findings.md
│   │   └── western_accessibility.md
│   ├── platforms/
│   │   ├── aliexpress.md
│   │   ├── dhgate.md
│   │   └── temu.md
│   ├── search/
│   │   └── term_mapping.md
│   └── security/
│       └── scam_detection.md
│   └── technical/
│       ├── phase1_features.md
│       └── specifications.md
│   └── vetted/
│       └── analysis.md
├── src/
│   ├── manifest.json
│   ├── background/
│   │   ├── background.ts
│   │   ├── components/
│   │   ├── services/
│   │   │   ├── serviceManager.ts
│   │   │   ├── insight/
│   │   │   │   └── priceAnalyzer.ts
│   │   │   └── protect/
│   │   │       ├── aiDetector.ts
│   │   │       └── securityAnalyzer.ts
│   │   ├── types/
│   │   └── utils/
│   ├── common/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── dataProcessing.ts
│   │       └── storage.ts
│   ├── content/
│   │   ├── components/
│   │   └── services/
│   │       ├── platformDetector.ts
│   │       ├── priceExtractor.ts
│   │       └── productExtractor.ts
│   │   └── types/
│   │   └── utils/
│   ├── popup/
│   │   ├── index.tsx
│   │   ├── components/
│   │   │   ├── App.tsx
│   │   │   ├── insight/
│   │   │   │   └── InsightSection.tsx
│   │   │   └── protect/
│   │   │       └── ProtectSection.tsx
│   │   │   └── scout/
│   │   │       └── ScoutSection.tsx
│   │   ├── services/
│   │   ├── store/
│   │   │   └── rootReducer.ts
│   │   ├── styles/
│   │   │   └── App.module.css
│   │   ├── types/
│   │   └── utils/
│   └── types/
│       └── css.d.ts
└── tests/
    ├── setup.ts
    ├── e2e/
    ├── integration/
    ├── setup/
    ├── setup/environment.d.ts
    ├── setup/mocks/
    ├── setup/mocks/chrome.ts
    ├── setup/mocks/types.ts
    ├── setup/utils/
    ├── setup/utils/reactTestUtils.tsx
    ├── setup/utils/testUtils.ts
    ├── unit/
    │   ├── components/
    │   │   └── ProtectSection.test.tsx
    │   ├── services/
    │   │   ├── platformDetector.test.ts
    │   │   ├── priceExtractor.test.ts
    │   │   ├── productExtractor.test.ts
    │   │   └── securityAnalyzer.test.ts
    │   └── utils/
    │       ├── dataProcessing.test.ts
    │       └── storage.test.ts
```
