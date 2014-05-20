require 'httparty'
require 'awesome_print'
require 'cgi'
require 'csv'

class Concept
  attr_accessor :uri, :label, :group_label, :number_of_publications, :number_of_authors

  def self.parse_hash(hash)
    return_value = Concept.new

    return_value.uri = hash['object']['resource']
    return_value.label = hash['label']

    return_value
  end

  def self.parse_about_hash(concepts, about_hash)
    concept = concepts.select { |concept| concept.uri == about_hash['about'] }[0]

    if (about_hash['meshSemanticGroupName'].is_a?(Array))
      about_hash['meshSemanticGroupName'].map! { |group_name| CGI.unescapeHTML(group_name) }
      concept.group_label = about_hash['meshSemanticGroupName'].join('; ')
    else
      concept.group_label = CGI.unescapeHTML(about_hash['meshSemanticGroupName'])
    end

    concept.number_of_authors = about_hash['numberOfAuthors']['__content__'] if about_hash['numberOfAuthors'] != nil
    concept.number_of_publications = about_hash['numberOfPublications']['__content__'] if about_hash['numberOfPublications'] != nil
  end
end

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

  def mine(limit)
    offset = next_offset
    ap_options = { :plain => true }

    result = self.class.post('http://profiles.sc-ctsi.org/ProfilesSearchAPI/ProfilesSearchAPI.svc/Search', :body => list_concepts_api_call_body_xml(offset, limit), :headers => { "Content-Type" => "text/xml"})
    result = result.parsed_response['RDF']['Description']

    return 'Finished' if result.size == 0

    concept_hashes = result.slice(1, limit)
    concept_about_hashes = result.slice(limit + 1, limit)

    concepts = []

    concept_hashes.each do |concept_hash|
      concepts << Concept.parse_hash(concept_hash)
    end

    concept_about_hashes.each do |concept_about|
      # ap concept_about, ap_options
      Concept.parse_about_hash(concepts, concept_about)
    end

    # ap concepts, ap_options
    # ap result.parsed_response['RDF']['Description'][0], ap_options

    commit_concepts_to_file(concepts)
    commit_bookmark(offset + limit)
  end

  def next_offset
    return_value = '0'

    if File.exist?('bookmark.txt')
      File.open('bookmark.txt', 'r') do |f|
        return_value = f.gets
      end
    end

    return_value.to_i
  end

  def commit_concepts_to_file(concepts)
    CSV.open('mined_data.csv', 'ab') do |csv|
      concepts.each do |concept|
        csv << [concept.uri, concept.label, concept.group_label, concept.number_of_publications, concept.number_of_authors]
      end
    end
  end

  def commit_bookmark(next_offset)
    File.open('bookmark.txt', 'w') do |f|
      f.print next_offset
    end
  end
end

result = ''
miner = ProfilesDataMiner.new

while result != 'Finished'
  result = miner.mine(100)
end

