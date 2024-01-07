<script lang="ts">
import { rawOrStoreValue } from 'common/stores'

import type { CreationRuleDefinition } from 'common/settings/CreationRule';
import type CreationRule from 'common/settings/CreationRule';
import ExtractedEmojiIcon from './ExtractedEmojiIcon.svelte';

export let rule: CreationRule | CreationRuleDefinition
</script><ExtractedEmojiIcon text={rawOrStoreValue(rule.name)} defaultEmoji="📄"/>