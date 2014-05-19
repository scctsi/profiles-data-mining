require 'httparty'
require 'awesome_print'
require 'rdf/raptor'

class ProfilesDataMiner
  include HTTParty
  format :xml

  def list_concepts_api_call_body_xml(offset, limit)
    <<-HERE
    <SearchOptions>
      <MatchOptions>
          <SearchString ExactMatch="false"></SearchString>
          <ClassGroupURI>http://profiles.catalyst.harvard.edu/ontology/prns#ClassGroupConcepts</ClassGroupURI>
      </MatchOptions>
      <OutputOptions>
          <Offset>#{offset}</Offset>
          <Limit>#{limit}</Limit>
      </OutputOptions>
    </SearchOptions>
    HERE
  end

  def mine
    body_xml = list_concepts_api_call_body_xml(0, 2)

    result = self.class.post('http://profiles.sc-ctsi.org/ProfilesSearchAPI/ProfilesSearchAPI.svc/Search', :body => body_xml, :headers => { "Content-Type" => "text/xml"})

    ap_options = { :plain => true }

    ap result.parsed_response['RDF']['Description'], ap_options
    ap result.parsed_response['RDF']['Description'][0], ap_options
  end
end

miner = ProfilesDataMiner.new
miner.mine

