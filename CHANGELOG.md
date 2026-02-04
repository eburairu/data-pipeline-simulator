# [1.3.0](https://github.com/eburairu/data-pipeline-simulator/compare/v1.2.0...v1.3.0) (2026-02-04)


### Bug Fixes

* auto-select default path when changing target connection in DataSourceSettings ([b4a7964](https://github.com/eburairu/data-pipeline-simulator/commit/b4a7964e4ab6a899657532aaced647e60ca6c955))
* enforce Left-to-Right layout direction on mobile for PipelineFlow ([28ea330](https://github.com/eburairu/data-pipeline-simulator/commit/28ea3308e50c9e69a17b65d579fe00530b664806))
* resolve build errors due to unused types and type mismatches in MappingEngine ([5d2c135](https://github.com/eburairu/data-pipeline-simulator/commit/5d2c135f8e9ec9cd469217791b3a3613cc54c8f6))
* resolve JobMonitor layout overflow issues on mobile ([6c96a73](https://github.com/eburairu/data-pipeline-simulator/commit/6c96a734114088d0c34f3e2755e5ba557bcbaf1b))
* restore JobMonitor visualizer with mobile adjustments and remove SimulationManager visualizer ([0effe69](https://github.com/eburairu/data-pipeline-simulator/commit/0effe69e287d45121ec11b252356cb4c5d9b2800))
* show database objects and task dependencies in TaskFlow visualization ([bdf9cae](https://github.com/eburairu/data-pipeline-simulator/commit/bdf9cae621bfac5dbac7000900b5f80f190a09ca))
* use functional state updates in DataSourceSettings to prevent race conditions ([8ceaa3d](https://github.com/eburairu/data-pipeline-simulator/commit/8ceaa3da7e57d27878b084b08ec5a32510e71856))


### Features

* add `ParamInput` component for key-value editing and limit displayed records in `DatabaseView`. ([0830594](https://github.com/eburairu/data-pipeline-simulator/commit/083059466310b593d82d7ee5a0f505a633683afc))
* add `speckit` agent for orchestrating Specification-Driven Development (SDD) processes ([6a243eb](https://github.com/eburairu/data-pipeline-simulator/commit/6a243ebd78264d0cf90152b6d25b2eff19af3928))
* add CDI-R collection enhancement features (Phase 1-4) ([eee05a7](https://github.com/eburairu/data-pipeline-simulator/commit/eee05a785d17be19be10bcd0d3579a512d62dd44))
* add data flow edges between TaskFlow and data sources ([9a219e8](https://github.com/eburairu/data-pipeline-simulator/commit/9a219e8884cd1cf1bf473573f7a34e4ff2890480))
* CDIルータ変換修正の仕様を007として新規作成し、関連する仕様書とテンプレートを更新しました。 ([9b470df](https://github.com/eburairu/data-pipeline-simulator/commit/9b470dfdcae556832621a584cbd772a07ace5756))
* Data Pipeline Simulatorの収集機能強化計画を更新し、Phase 1の完全実装とPhase 2-4の型定義・UIを追加 ([20e0501](https://github.com/eburairu/data-pipeline-simulator/commit/20e05018397c281a7eaafa935235e65b505c236d))
* Data Pipeline Simulatorの収集機能強化計画を追加 ([e36ca9e](https://github.com/eburairu/data-pipeline-simulator/commit/e36ca9e305c838350d71f538e5e7fcda48b15207))
* DeliveryJobにファイル転送後にソースファイルを削除するオプションを追加 ([3c842b2](https://github.com/eburairu/data-pipeline-simulator/commit/3c842b21e3aa63d21b1bf1dcff1e76685ef60c7d))
* display validation error details when save fails ([8fc966f](https://github.com/eburairu/data-pipeline-simulator/commit/8fc966f8cc34658a58489c717d5a48d16f022def))
* filter processed files by jobId in `useSimulationEngine` ([4f76dee](https://github.com/eburairu/data-pipeline-simulator/commit/4f76deeb8019624cb2f7709f49f45f1adb8c1bd1))
* group validation errors by section with item names ([8809eaa](https://github.com/eburairu/data-pipeline-simulator/commit/8809eaaf12d83d92f974b359fe76f92456309800))
* Implement a custom delete confirmation modal for database table and column deletions. ([3955012](https://github.com/eburairu/data-pipeline-simulator/commit/39550122e936a6756cbf8fa4591f3c5a68fd8c5f))
* Implement functional Router transformation for CDI simulation ([55a9e79](https://github.com/eburairu/data-pipeline-simulator/commit/55a9e79aa40e3d75e4f62a3bd607d2fadc150daa))
* make source and target paths selectable in DeliverySettings ([d34193f](https://github.com/eburairu/data-pipeline-simulator/commit/d34193f5421bee3dd0a9ec10d6dfa5391bbd0fec))
* remove PipelineFlow visualizer from JobMonitor tab ([0e9ee14](https://github.com/eburairu/data-pipeline-simulator/commit/0e9ee14d5e8d6adae9d06b6fc597d1dbb938102d))
* update executeDeliveryJob reference to avoid circular dependency ([98f6b42](https://github.com/eburairu/data-pipeline-simulator/commit/98f6b424eb2a9d9da035ec80926ab8d6e78a9d50))
* use stable reference for engines in timers to prevent reinitialization ([18391bd](https://github.com/eburairu/data-pipeline-simulator/commit/18391bd6e199016fb19161f4782cd64d9ce4d847))
* ページタイトルを"Data Pipeline Simulator"に更新 ([507c2a5](https://github.com/eburairu/data-pipeline-simulator/commit/507c2a58338348a7b98246108d93a44ec9b86040))
* 仮想DBの永続化を廃止し、ページリロード時にデータをリセットするよう変更 ([9ed2ce4](https://github.com/eburairu/data-pipeline-simulator/commit/9ed2ce4dcd4bd53d930a4457721699bb8a720d54))
* 接続選択後のパス/テーブル選択UIを追加し、MappingDesignerを拡張 ([53e76e5](https://github.com/eburairu/data-pipeline-simulator/commit/53e76e594ecd037d6ea81cee6ff1b5f5fcaa4e69))

# [1.2.0](https://github.com/eburairu/data-pipeline-simulator/compare/v1.1.0...v1.2.0) (2026-02-02)


### Bug Fixes

* import Workflow icon and further strengthen pre-push hook ([e41cde8](https://github.com/eburairu/data-pipeline-simulator/commit/e41cde8e58aae410cb8535c17c5b5fd8957f10ff))
* resolve TS unused variable errors and strengthen pre-push hook ([67aa05f](https://github.com/eburairu/data-pipeline-simulator/commit/67aa05fb2ee58594c701002d2c17c2d8febf8754))


### Features

* add GUI Flow Designer and enable TaskFlow monitoring ([7962459](https://github.com/eburairu/data-pipeline-simulator/commit/7962459fa41e12abb7c1647ed337f9d1b97c7615))
* add PipelineFlow visualizer to JobMonitor tab ([5b485a9](https://github.com/eburairu/data-pipeline-simulator/commit/5b485a9f42454605a3fe1cacce90495caf8586c3))
* add TaskFlow orchestration for multiple mapping tasks ([c66810a](https://github.com/eburairu/data-pipeline-simulator/commit/c66810a3023a1baffd7b2db06bc136a354955e5e))
* enhance TaskFlow monitoring and fix purity lint issues ([59ee972](https://github.com/eburairu/data-pipeline-simulator/commit/59ee97239ce7abd60f70125210ab53c661bf7336))
* name flow panel and add nested taskflow display in monitor ([977ede1](https://github.com/eburairu/data-pipeline-simulator/commit/977ede1084bbef745381a25a63c80f6f25254f58))

# [1.1.0](https://github.com/eburairu/data-pipeline-simulator/compare/v1.0.0...v1.1.0) (2026-02-01)


### Bug Fixes

* enable idempotency jobs by default and improve user guidance ([b305877](https://github.com/eburairu/data-pipeline-simulator/commit/b305877817890f537f9338af5a61a54d01fc88bf))
* resolve build errors related to missing imports and unused variables ([2047847](https://github.com/eburairu/data-pipeline-simulator/commit/2047847b70e8f1bd5aea85ff0328c9795eee5f76))


### Features

* add idempotency test template and setup button ([731e2b3](https://github.com/eburairu/data-pipeline-simulator/commit/731e2b3cadd1627fdd35bb561c86cfabf74fb2fa))
* Change default database view mode to table ([40b15ba](https://github.com/eburairu/data-pipeline-simulator/commit/40b15ba87fb2a434e25ff49cc4b9424104366da2))
* Improve mobile responsiveness and safe local CI testing ([ebe4260](https://github.com/eburairu/data-pipeline-simulator/commit/ebe4260ec1626e000cfa63f26ac78b25727dcafa))
* refactor pipeline templates into a dedicated service and UI manager ([e01cefa](https://github.com/eburairu/data-pipeline-simulator/commit/e01cefa957445ef4c66ef2c08c186cf1c39feea0))

# 1.0.0 (2026-02-01)


### Bug Fixes

* add header row to default data source content ([3c2d0d1](https://github.com/eburairu/data-pipeline-simulator/commit/3c2d0d174c3cc36ef67f55483f60bb28cf9ea796))
* allow pipeline processing to continue when auto-run is stopped ([1e6feee](https://github.com/eburairu/data-pipeline-simulator/commit/1e6feee565324ccf72d2a97335ef302bd94b9c2b))
* **build:** resolve unused variable errors in typescript ([c8b7ebf](https://github.com/eburairu/data-pipeline-simulator/commit/c8b7ebfdaf4ddcdb208030bf7002a53c4f32d6ea))
* Ensure MappingEngine uses latest table definitions and handles CSV line endings robustly ([469410d](https://github.com/eburairu/data-pipeline-simulator/commit/469410da1603f6d7008c23063b812d92e0411982)), closes [#bug-fix-raw-insert](https://github.com/eburairu/data-pipeline-simulator/issues/bug-fix-raw-insert)
* prevent topic redelivery and refactor visualization ([f6f175f](https://github.com/eburairu/data-pipeline-simulator/commit/f6f175fa5e8ff52dfbcf6075271d1e3c40f3d26a))
* remove unused biDashboard variable in App.tsx ([929a345](https://github.com/eburairu/data-pipeline-simulator/commit/929a345e627c6660b0d2628e8afb4c8d27078209))
* resolve typescript build errors ([4fca21c](https://github.com/eburairu/data-pipeline-simulator/commit/4fca21c7bedaedc2d44d03dd883d854dc86daf23))
* resolve typescript build errors ([62f6a77](https://github.com/eburairu/data-pipeline-simulator/commit/62f6a77656b17ba9cccc571c3ca544bea34262c8))
* **test:** remove unused React import in VirtualFileSystem.test.tsx ([1a12da1](https://github.com/eburairu/data-pipeline-simulator/commit/1a12da12256c5dbb140c1a6a2cfd03aa98085fff))
* **ui:** enable drag-and-drop connection in MappingDesigner ([424e280](https://github.com/eburairu/data-pipeline-simulator/commit/424e280aaeefd1114508483e49aaadc3c0e3967b))


### Features

* add 9 new IDMC CDI transformation types ([b457cbb](https://github.com/eburairu/data-pipeline-simulator/commit/b457cbbfd6f08218809676f535eebf37a137cd6f))
* add BI dashboard for table visualization and charting ([a328cdd](https://github.com/eburairu/data-pipeline-simulator/commit/a328cdd0b20c5455d89984feb8b394322743ba92))
* add CIH and CDI simulation features ([e50b490](https://github.com/eburairu/data-pipeline-simulator/commit/e50b490df972190395f1a894f12231f137d2d011))
* add CIH simulation features ([a8413a4](https://github.com/eburairu/data-pipeline-simulator/commit/a8413a44b197acf852aaa7acce041a88a08f395a))
* Add configurable execution frequency for pipeline steps ([acb05f8](https://github.com/eburairu/data-pipeline-simulator/commit/acb05f80e5ba5ec324fcfbf1b7bfc4d39bed8451))
* add database schema management and table visualization ([d4c0ee1](https://github.com/eburairu/data-pipeline-simulator/commit/d4c0ee16a414f64b9f40f8ea141cfae7220bc131))
* Add Deduplicator, Pivot, Unpivot, and SQL transformation types with corresponding UI and engine logic. ([0f76cc3](https://github.com/eburairu/data-pipeline-simulator/commit/0f76cc3a89f6585cfccd6af948db3527b1ec3e5f))
* Add infrastructure settings for managing hosts and directories ([daa9542](https://github.com/eburairu/data-pipeline-simulator/commit/daa9542ea4253ce64d680cb0ae5e02ba85f68a6d))
* add job monitoring dashboard and instrumentation ([91d5c33](https://github.com/eburairu/data-pipeline-simulator/commit/91d5c3392b42fb21dd20f724b3f6705e886e363f))
* Add joiner transformation type with UI configuration and pipeline execution logic. ([0672f9a](https://github.com/eburairu/data-pipeline-simulator/commit/0672f9a5cbcdf008f517fdd60d85e9ebb0ca35ae))
* Add Lookup, Router, Sorter, and Union transformation nodes with their processing logic and configuration UIs. ([e2c6006](https://github.com/eburairu/data-pipeline-simulator/commit/e2c60060502a1515638144b0cc2fbe0fa27a91b1))
* add mapping task dependencies and introduce expression functions for advanced mapping logic. ([f2e7617](https://github.com/eburairu/data-pipeline-simulator/commit/f2e7617d2945398693bc20d79dd74bb6c8d0771d))
* add mutex for collection jobs and dynamic processing time ([2f8ae84](https://github.com/eburairu/data-pipeline-simulator/commit/2f8ae84f1e09b2b7236c5225c50ed2f926db4c2e))
* add rename functionality to collection jobs ([e76ae7e](https://github.com/eburairu/data-pipeline-simulator/commit/e76ae7e4ef3b03f6df721f2069119ddaf916d179))
* add schema mode for data generation jobs ([a70a0bc](https://github.com/eburairu/data-pipeline-simulator/commit/a70a0bc92e19b55cf0dc8efebe602f79423a63e0))
* add support for multiple collection jobs ([273139c](https://github.com/eburairu/data-pipeline-simulator/commit/273139c081831e46c5f732f0d8be39ebaf36978d))
* add validator transformation and job retry ([de14596](https://github.com/eburairu/data-pipeline-simulator/commit/de145960033ef318cc795c579e6c638fcc3e8432))
* enhance BI Dashboard with auto-refresh and mobile-friendly layout, and add BI settings ([7bc7801](https://github.com/eburairu/data-pipeline-simulator/commit/7bc780160c5fe338f52eff095dd518a2b55dda5d))
* enhance ETL capabilities with advanced expressions and bad file generation ([dbc5953](https://github.com/eburairu/data-pipeline-simulator/commit/dbc59532b022aeccd5b1f1555d1efc50adb2c8ba))
* enhance job monitor with detailed stats and drill-down UI ([10be425](https://github.com/eburairu/data-pipeline-simulator/commit/10be42539448dda2ca55ac1c21be237d0f07d2cf))
* implement async execution and real-time monitoring ([4d88e58](https://github.com/eburairu/data-pipeline-simulator/commit/4d88e585a4d5ca8badacc7b8344feea25aa06a8c))
* implement automated releases via semantic-release and GitHub Actions, and rename the project. ([cb68adc](https://github.com/eburairu/data-pipeline-simulator/commit/cb68adca38f937b126b1bcd5a0880c55adeccb98))
* Implement granular control for simulation stages and add milliseconds to the default timestamp format. ([7bdcdc7](https://github.com/eburairu/data-pipeline-simulator/commit/7bdcdc70f6ca2bb37a4667bbd04561cfc7e35e90))
* implement idempotency simulation ([4ea7d76](https://github.com/eburairu/data-pipeline-simulator/commit/4ea7d762c2c3481cbd2090b7161ee5e22f3b86c3))
* implement IDMC CDI simulation concepts ([9da1a47](https://github.com/eburairu/data-pipeline-simulator/commit/9da1a475079b8bab1ebf3bc8811979ba7dbee1a9))
* implement independent and parallel job execution with file-level locking ([55dcfc4](https://github.com/eburairu/data-pipeline-simulator/commit/55dcfc479329e2e0d22fb131139acb6376209854))
* Implement persistent BI dashboard settings and multiple widgets ([e7caac6](https://github.com/eburairu/data-pipeline-simulator/commit/e7caac6118e42398084361b26c7f23b375a16f42))
* implement Speckit, an agent-driven specification and planning system with new agents, prompts, templates, and scripts. ([2351946](https://github.com/eburairu/data-pipeline-simulator/commit/2351946bf8613d6a8b82e9fe4f2f32ba6a53cf33))
* Implement tabbed navigation for the settings panel, organizing various settings components into distinct tabs. ([283ebf0](https://github.com/eburairu/data-pipeline-simulator/commit/283ebf0db8a080ef721b907687fb4cb73f0ffe3a))
* Introduce lookup, router, sorter, and union transformation types and refactor agent skill definitions. ([fba8565](https://github.com/eburairu/data-pipeline-simulator/commit/fba856515b50a5f26ad3787da2cc4bf7032cb7d8))
* optimize mobile responsiveness and add full-height BI Dashboard tab ([5e22e38](https://github.com/eburairu/data-pipeline-simulator/commit/5e22e38ee9d63ad52af4453877b2c6dc9872995b))
* Responsive Mapping Designer UI ([48b7c32](https://github.com/eburairu/data-pipeline-simulator/commit/48b7c32f84415bf96f472340379bf227b2a138f0))
* separate data source definition from file generation jobs ([f3ba9c5](https://github.com/eburairu/data-pipeline-simulator/commit/f3ba9c5269b29f7d5bd85e626baa062b4f11bf55))
* separate settings for Data Source, Collection, Delivery, and ETL ([c295a47](https://github.com/eburairu/data-pipeline-simulator/commit/c295a47dd352b01224875a26ac24067e2d3ca7e3))
* support multiple data source and delivery jobs with flexible configuration ([bba7cc6](https://github.com/eburairu/data-pipeline-simulator/commit/bba7cc6d7af0cfe43d48828bfe1e22005b04ef00))
* Support variables in file name and content ([0cea259](https://github.com/eburairu/data-pipeline-simulator/commit/0cea2595bf1f2fd35c49b3e588b43da5837823ef))
* update source file naming to include microseconds ([18fc3e3](https://github.com/eburairu/data-pipeline-simulator/commit/18fc3e371a00269608c3e01730a837ab99ee0120))
* Use textarea for file content template ([7b0a19e](https://github.com/eburairu/data-pipeline-simulator/commit/7b0a19e4a57e24cd6142803a55c3834fbb5229e5))
* Visualize Generation Jobs and Add Auto-Align Feature ([6ef0b98](https://github.com/eburairu/data-pipeline-simulator/commit/6ef0b98f889baa2813cf7644006bd6b61ce8ae94))
* データパイプライン・シミュレーターの初期構築 ([468960c](https://github.com/eburairu/data-pipeline-simulator/commit/468960c67a416ebb2677a2da018654a94c8f24b1))
