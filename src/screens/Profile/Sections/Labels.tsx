import React from 'react'
import {View} from 'react-native'
import {
  AppBskyLabelerDefs,
  ModerationOpts,
  interpretLabelValueDefinitions,
  InterpretedLabelValueDefinition,
} from '@atproto/api'
import {Trans, msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useSafeAreaFrame} from 'react-native-safe-area-context'

import {useScrollHandlers} from '#/lib/ScrollContext'
import {useAnimatedScrollHandler} from '#/lib/hooks/useAnimatedScrollHandler_FIXED'
import {isLabelerSubscribed, lookupLabelValueDefinition} from '#/lib/moderation'
import {ListRef} from '#/view/com/util/List'
import {SectionRef} from './types'
import {isNative} from '#/platform/detection'

import {useTheme, atoms as a} from '#/alf'
import {Text} from '#/components/Typography'
import {Loader} from '#/components/Loader'
import {Divider} from '#/components/Divider'
import {CenteredView, ScrollView} from '#/view/com/util/Views'
import {ErrorState} from '../ErrorState'
import {ModerationLabelPref} from '#/components/moderation/ModerationLabelPref'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'

interface LabelsSectionProps {
  isLabelerLoading: boolean
  labelerInfo: AppBskyLabelerDefs.LabelerViewDetailed | undefined
  labelerError: Error | null
  moderationOpts: ModerationOpts
  scrollElRef: ListRef
  headerHeight: number
}
export const ProfileLabelsSection = React.forwardRef<
  SectionRef,
  LabelsSectionProps
>(function LabelsSectionImpl(
  {
    isLabelerLoading,
    labelerInfo,
    labelerError,
    moderationOpts,
    scrollElRef,
    headerHeight,
  },
  ref,
) {
  const {_} = useLingui()
  const {height: minHeight} = useSafeAreaFrame()

  const onScrollToTop = React.useCallback(() => {
    // @ts-ignore TODO fix this
    scrollElRef.current?.scrollTo({
      animated: isNative,
      x: 0,
      y: -headerHeight,
    })
  }, [scrollElRef, headerHeight])

  React.useImperativeHandle(ref, () => ({
    scrollToTop: onScrollToTop,
  }))

  return (
    <CenteredView style={{flex: 1, minHeight}} sideBorders>
      {isLabelerLoading ? (
        <View style={[a.w_full, a.align_center]}>
          <Loader size="xl" />
        </View>
      ) : labelerError || !labelerInfo ? (
        <ErrorState
          error={
            labelerError?.toString() ||
            _(msg`Something went wrong, please try again.`)
          }
        />
      ) : (
        <ProfileLabelsSectionInner
          moderationOpts={moderationOpts}
          labelerInfo={labelerInfo}
          scrollElRef={scrollElRef}
          headerHeight={headerHeight}
        />
      )}
    </CenteredView>
  )
})

export function ProfileLabelsSectionInner({
  moderationOpts,
  labelerInfo,
  scrollElRef,
  headerHeight,
}: {
  moderationOpts: ModerationOpts
  labelerInfo: AppBskyLabelerDefs.LabelerViewDetailed
  scrollElRef: ListRef
  headerHeight: number
}) {
  const t = useTheme()
  const contextScrollHandlers = useScrollHandlers()

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag(e, ctx) {
      contextScrollHandlers.onBeginDrag?.(e, ctx)
    },
    onEndDrag(e, ctx) {
      contextScrollHandlers.onEndDrag?.(e, ctx)
    },
    onScroll(e, ctx) {
      contextScrollHandlers.onScroll?.(e, ctx)
    },
  })

  const {labelValues} = labelerInfo.policies
  const isSubscribed = isLabelerSubscribed(labelerInfo, moderationOpts)
  const labelDefs = React.useMemo(() => {
    const customDefs = interpretLabelValueDefinitions(labelerInfo)
    return labelValues
      .map(val => lookupLabelValueDefinition(val, customDefs))
      .filter(
        def => def && def?.configurable,
      ) as InterpretedLabelValueDefinition[]
  }, [labelerInfo, labelValues])

  return (
    <ScrollView
      // @ts-ignore TODO fix this
      ref={scrollElRef}
      scrollEventThrottle={1}
      contentContainerStyle={{
        paddingTop: headerHeight,
        borderWidth: 0,
      }}
      contentOffset={{x: 0, y: headerHeight * -1}}
      onScroll={scrollHandler}>
      <View style={[a.pt_xl, a.px_lg, a.border_t, t.atoms.border_contrast_low]}>
        <View>
          <Text style={[t.atoms.text_contrast_high, a.leading_snug, a.text_sm]}>
            <Trans>
              Labels are annotations on users and content. They can be used to
              hide, warn, and categorize the network.
            </Trans>
          </Text>
          {labelerInfo.creator.viewer?.blocking ? (
            <View style={[a.flex_row, a.gap_sm, a.align_center, a.mt_md]}>
              <CircleInfo size="sm" fill={t.atoms.text_contrast_medium.color} />
              <Text
                style={[t.atoms.text_contrast_high, a.leading_snug, a.text_sm]}>
                <Trans>
                  Blocking does not prevent this labeler from placing labels on
                  your account.
                </Trans>
              </Text>
            </View>
          ) : null}
          {labelValues.length === 0 ? (
            <Text
              style={[
                a.pt_xl,
                t.atoms.text_contrast_high,
                a.leading_snug,
                a.text_sm,
              ]}>
              <Trans>
                This labeler hasn't declared what labels it publishes, and may
                not be active.
              </Trans>
            </Text>
          ) : !isSubscribed ? (
            <Text
              style={[
                a.pt_xl,
                t.atoms.text_contrast_high,
                a.leading_snug,
                a.text_sm,
              ]}>
              <Trans>
                Subscribe to @{labelerInfo.creator.handle} to use these labels:
              </Trans>
            </Text>
          ) : null}
        </View>
        {labelDefs.length > 0 && (
          <View
            style={[
              a.mt_xl,
              a.w_full,
              a.rounded_md,
              a.overflow_hidden,
              t.atoms.bg_contrast_25,
            ]}>
            {labelDefs.map((labelDef, i) => {
              return (
                <React.Fragment key={labelDef.identifier}>
                  {i !== 0 && <Divider />}
                  <ModerationLabelPref
                    disabled={isSubscribed ? undefined : true}
                    labelValueDefinition={labelDef}
                    labelerDid={labelerInfo.creator.did}
                  />
                </React.Fragment>
              )
            })}
          </View>
        )}

        <View style={{height: 400}} />
      </View>
    </ScrollView>
  )
}
