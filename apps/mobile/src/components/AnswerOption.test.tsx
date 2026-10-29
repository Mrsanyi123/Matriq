import { palette } from '@matriq/ui';
import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithProviders } from '../test/render';
import { AnswerOption, optionState, type OptionState } from './AnswerOption';

describe('optionState', () => {
  it('only tracks the selection before checking', () => {
    expect(optionState('a', null, null)).toBe('idle');
    expect(optionState('a', 'a', null)).toBe('selected');
    expect(optionState('b', 'a', null)).toBe('idle');
  });

  it('marks right, wrong and locked options after checking', () => {
    expect(optionState('c', 'b', 'c')).toBe('right');
    expect(optionState('b', 'b', 'c')).toBe('wrong');
    expect(optionState('a', 'b', 'c')).toBe('locked');
    expect(optionState('c', 'c', 'c')).toBe('right');
  });
});

describe('<AnswerOption />', () => {
  const cases: [OptionState, string, boolean][] = [
    ['idle', palette.optionBorder, false],
    ['selected', palette.optionSelectedBorder, false],
    ['right', palette.rightBorder, true],
    ['wrong', palette.wrongBorder, true],
    ['locked', palette.optionBorder, true],
  ];

  it.each(cases)('renders the %s state', async (state, border, disabled) => {
    const onPress = jest.fn();
    await renderWithProviders(
      <AnswerOption testID="opt" label="B" body="6" state={state} chosen={state === 'selected' || state === 'wrong'} onPress={onPress} />,
    );
    const option = await screen.findByTestId('opt');
    expect(StyleSheet.flatten(option.props.style).borderColor).toBe(border);
    expect(option.props.accessibilityState).toMatchObject({ disabled });
    await fireEvent.press(option);
    expect(onPress).toHaveBeenCalledTimes(disabled ? 0 : 1);
  });

  it('announces the result after checking', async () => {
    await renderWithProviders(<AnswerOption testID="opt" label="C" body="8" state="right" chosen={false} onPress={() => {}} />);
    const option = await screen.findByTestId('opt');
    expect(option.props.accessibilityLabel).toBe('Option C: 8, Correct');
    expect(option.props.accessibilityLanguage).toBe('en');
  });
});
