import CodeEditor from 'components/CodeEditor/index';
import get from 'lodash/get';
import { HTTPSnippet } from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import { buildHarRequest } from 'utils/codegenerator/har';
import { useSelector } from 'react-redux';

const CodeView = ({ language, item }) => {
  const { storedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { target, client, language: lang } = language;
  let snippet = '';

  try {
    snippet = new HTTPSnippet(buildHarRequest(item.request)).convert(target, client);
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <CodeEditor
      readOnly
      value={snippet}
      font={get(preferences, 'font.codeFont', 'default')}
      theme={storedTheme}
      mode={lang}
    />
  );
};

export default CodeView;
