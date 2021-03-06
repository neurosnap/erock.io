import React from 'react';
import { StaticQuery, graphql } from 'gatsby';

function Footer() {
  return (
    <StaticQuery
      query={footerQuery}
      render={(data) => {
        const { social } = data.site.siteMetadata;
        return (
          <footer>
            <div style={{ float: 'right' }}>
              <a href="/rss.xml" target="_blank" rel="noopener noreferrer">
                rss
              </a>
            </div>
            <a
              href={`https://twitter.com/${social.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              twitter
            </a>{' '}
            &bull;{' '}
            <a
              href={`https://github.com/${social.github}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>{' '}
            &bull;{' '}
            <a
              href={social.stackoverflow}
              target="_blank"
              rel="noopener noreferrer"
            >
              stack overflow
            </a>
          </footer>
        );
      }}
    />
  );
}

const footerQuery = graphql`
  query FooterQuery {
    site {
      siteMetadata {
        social {
          twitter
          github
          stackoverflow
        }
      }
    }
  }
`;

export default Footer;
