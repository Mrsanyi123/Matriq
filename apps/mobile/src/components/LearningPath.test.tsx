import { fireEvent, screen } from '@testing-library/react-native';
import { chapters } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { LearningPath, nodeIcon, nodeState, trailPath } from './LearningPath';

describe('learning path node states', () => {
  it('derives complete / current / idle from chapter status and the current chapter', () => {
    const [done, reading, notStarted] = chapters;
    expect(nodeState(done!, reading!.id)).toBe('complete');
    expect(nodeState(reading!, reading!.id)).toBe('current');
    expect(nodeState(notStarted!, reading!.id)).toBe('idle');
    // A completed chapter stays complete even if it is the current id.
    expect(nodeState(done!, done!.id)).toBe('complete');
  });

  it('cycles the prototype icons and shows a check when complete', () => {
    expect(nodeIcon(0, 'current')).toBe('BookOpen');
    expect(nodeIcon(1, 'idle')).toBe('Layers');
    expect(nodeIcon(5, 'idle')).toBe('Layers');
    expect(nodeIcon(2, 'complete')).toBe('Check');
  });

  it('draws a vertical-tangent trail through the node centres', () => {
    expect(trailPath([])).toBe('');
    expect(
      trailPath([
        { x: 47, y: 66 },
        { x: 98, y: 170 },
        { x: 47, y: 274 },
      ]),
    ).toBe('M47 66 C47 118 98 118 98 170 S47 222 47 274');
  });

  it('renders each node in its state and opens a chapter on press', async () => {
    const onOpen = jest.fn();
    await renderWithProviders(
      <LearningPath chapters={chapters} currentChapterId={chapters[1]!.id} onOpen={onOpen} />,
    );
    expect(await screen.findByTestId('path-node-1-complete')).toBeTruthy();
    expect(screen.getByTestId('path-node-2-current')).toBeTruthy();
    expect(screen.getByTestId('path-node-3-idle')).toBeTruthy();

    const current = screen.getByTestId('path-stop-2');
    expect(current.props.accessibilityLabel).toBe('Chapter 2: Limits & continuity. Continue');
    expect(current.props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Up next')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('path-stop-3'));
    expect(onOpen).toHaveBeenCalledWith(chapters[2]);
  });
});
